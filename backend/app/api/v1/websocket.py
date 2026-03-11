"""WebSocket server for real-time collaboration."""

import math
from typing import Dict, Set

import socketio
from socketio.exceptions import ConnectionRefusedError
from sqlalchemy.orm import Session

from app.api.deps import resolve_user_from_token
from app.config import settings
from app.core.collision import validate_layout
from app.core.logging import get_logger
from app.database import SessionLocal
from app.models.user import User
from app.services.project_service import ProjectAccessDeniedError, ProjectNotFoundError, ProjectService

logger = get_logger("websocket")

# Create Socket.IO server with restricted CORS origins
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.origins_list,
    logger=True,
    engineio_logger=False,
)

# Track active connections per project
# {project_id: {sid: {user_id, nickname, color, sid}}}
active_rooms: Dict[int, Dict[str, dict]] = {}

# Track locked objects
# {project_id: {furniture_id: {sid, user_id}}}
locked_objects: Dict[int, Dict[str, dict]] = {}

# Track authenticated sockets and joined rooms
socket_users: Dict[str, dict] = {}
socket_rooms: Dict[str, Set[int]] = {}


def _extract_token(auth: dict | None, environ: dict) -> str | None:
    """Extract a bearer token from the Socket.IO auth payload or headers."""
    if isinstance(auth, dict):
        token = auth.get("token")
        if isinstance(token, str) and token.strip():
            return token.strip()

    auth_header = environ.get("HTTP_AUTHORIZATION")
    if isinstance(auth_header, str) and auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()

    return None


def _with_db(callback):
    """Run a callback with a short-lived database session."""
    db: Session = SessionLocal()
    try:
        return callback(db)
    finally:
        db.close()


def _get_socket_user(sid: str) -> dict | None:
    """Return the authenticated socket user context."""
    return socket_users.get(sid)


def _socket_joined_project(sid: str, project_id: int) -> bool:
    """Check whether the socket has joined the given project room."""
    return project_id in socket_rooms.get(sid, set())


def _generate_user_color(user_id: int) -> str:
    """Generate a deterministic collaboration color for the user."""
    return f"#{int(abs(math.sin(user_id) * 16777215)) & 0xFFFFFF:06x}"


@sio.event
async def connect(sid, environ, auth):
    """Authenticate the Socket.IO connection before accepting it."""
    token = _extract_token(auth, environ)
    if not token:
        raise ConnectionRefusedError("Authentication required")

    try:
        user = _with_db(lambda db: resolve_user_from_token(token, db))
    except Exception as exc:
        raise ConnectionRefusedError("Authentication failed") from exc

    socket_users[sid] = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
    }
    socket_rooms[sid] = set()
    logger.debug(f"Authenticated client {sid} as user {user.id}")


@sio.event
async def disconnect(sid):
    """Handle client disconnection and clean up ephemeral collaboration state."""
    logger.debug(f"Client {sid} disconnected")

    for project_id, users in active_rooms.items():
        if sid in users:
            del users[sid]
            room = f"project_{project_id}"
            await sio.emit("user_left", {"sid": sid}, room=room, skip_sid=sid)

    for project_id, locks in locked_objects.items():
        locks_to_remove = []
        for furniture_id, lock_info in locks.items():
            if lock_info.get("sid") == sid:
                locks_to_remove.append(furniture_id)

        for furniture_id in locks_to_remove:
            del locks[furniture_id]
            room = f"project_{project_id}"
            await sio.emit("object_unlocked", {"furniture_id": furniture_id}, room=room)
            logger.debug(f"Auto-released lock on {furniture_id} for disconnected user {sid}")

    socket_users.pop(sid, None)
    socket_rooms.pop(sid, None)


@sio.event
async def join_project(sid, data):
    """Join a project room only after verifying project access."""
    project_id = data.get("project_id")
    if not project_id:
        return
    project_id = int(project_id)

    socket_user = _get_socket_user(sid)
    if not socket_user:
        await sio.disconnect(sid)
        return

    try:
        def _load_user(db: Session):
            user = db.query(User).filter(User.id == socket_user["id"]).first()
            if user is None:
                raise ProjectAccessDeniedError("User not found")
            ProjectService(db).get_with_access_check(project_id, user)
            return user

        user = _with_db(_load_user)
    except (ProjectNotFoundError, ProjectAccessDeniedError):
        await sio.emit("join_error", {"message": "Not authorized to join this project"}, to=sid)
        return

    user_id = user.id
    nickname = user.full_name or user.email.split("@")[0] or f"User {user_id}"
    color = _generate_user_color(user_id)

    room = f"project_{project_id}"
    await sio.enter_room(sid, room)
    socket_rooms.setdefault(sid, set()).add(project_id)

    if project_id not in active_rooms:
        active_rooms[project_id] = {}

    active_rooms[project_id][sid] = {
        "user_id": user_id,
        "nickname": nickname,
        "color": color,
        "sid": sid,
    }

    logger.info(f"User {nickname} ({user_id}) joined project {project_id}")

    await sio.emit(
        "user_joined",
        {
            "user_id": user_id,
            "nickname": nickname,
            "color": color,
            "sid": sid,
        },
        room=room,
        skip_sid=sid,
    )

    current_users = list(active_rooms[project_id].values())
    await sio.emit("current_users", {"users": current_users}, to=sid)

    current_locks = locked_objects.get(project_id, {})
    if current_locks:
        locks_data = [
            {"furniture_id": furniture_id, "locked_by": lock_info.get("user_id")}
            for furniture_id, lock_info in current_locks.items()
        ]
        await sio.emit("current_locks", {"locks": locks_data}, to=sid)


@sio.event
async def furniture_move(sid, data):
    """Broadcast furniture movement to authorized collaborators."""
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")
    position = data.get("position")
    rotation = data.get("rotation")

    if not all([project_id, furniture_id, position]):
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    await sio.emit(
        "furniture_updated",
        {"furniture_id": furniture_id, "position": position, "rotation": rotation},
        room=f"project_{project_id}",
        skip_sid=sid,
    )


@sio.event
async def furniture_add(sid, data):
    """Broadcast furniture creation to authorized collaborators."""
    project_id = data.get("project_id")
    furniture = data.get("furniture")

    if not all([project_id, furniture]):
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    await sio.emit("furniture_added", {"furniture": furniture}, room=f"project_{project_id}", skip_sid=sid)


@sio.event
async def furniture_delete(sid, data):
    """Broadcast furniture deletion to authorized collaborators."""
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")

    if not all([project_id, furniture_id]):
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    await sio.emit(
        "furniture_deleted",
        {"furniture_id": furniture_id},
        room=f"project_{project_id}",
        skip_sid=sid,
    )


@sio.event
async def validate_furniture(sid, data):
    """Validate furniture layout and send results."""
    project_id = data.get("project_id")
    furniture_state = data.get("furniture_state")
    room_dimensions = data.get("room_dimensions")

    if not all([project_id, furniture_state, room_dimensions]):
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    result = validate_layout(furniture_state, room_dimensions)
    await sio.emit("validation_result", result, to=sid)

    if not result["valid"]:
        await sio.emit(
            "collision_detected",
            {"collisions": result["collisions"], "out_of_bounds": result["out_of_bounds"]},
            room=f"project_{project_id}",
        )


@sio.event
async def request_lock(sid, data):
    """Grant edit locks only to authenticated collaborators in the joined room."""
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")

    if not all([project_id, furniture_id]):
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    socket_user = _get_socket_user(sid)
    if not socket_user:
        return

    if project_id not in locked_objects:
        locked_objects[project_id] = {}

    current_lock = locked_objects[project_id].get(furniture_id)
    if current_lock and current_lock.get("sid") != sid:
        await sio.emit(
            "lock_rejected",
            {"furniture_id": furniture_id, "locked_by": current_lock.get("user_id")},
            to=sid,
        )
        return

    locked_objects[project_id][furniture_id] = {
        "sid": sid,
        "user_id": str(socket_user["id"]),
    }

    await sio.emit(
        "object_locked",
        {"furniture_id": furniture_id, "locked_by": str(socket_user["id"])},
        room=f"project_{project_id}",
    )
    logger.info(f"Lock granted on {furniture_id} to {sid}")


@sio.event
async def release_lock(sid, data):
    """Release locks only when the same socket owns them."""
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")

    if not all([project_id, furniture_id]):
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    if project_id in locked_objects and furniture_id in locked_objects[project_id]:
        if locked_objects[project_id][furniture_id].get("sid") == sid:
            del locked_objects[project_id][furniture_id]
            await sio.emit("object_unlocked", {"furniture_id": furniture_id}, room=f"project_{project_id}")
            logger.info(f"Lock released on {furniture_id} by {sid}")


@sio.event
async def update_presence(sid, data):
    """Broadcast collaborator cursor positions inside authorized rooms."""
    project_id = data.get("project_id")
    cursor_position = data.get("cursor_position")

    if not project_id or not cursor_position:
        return
    project_id = int(project_id)
    if not _socket_joined_project(sid, project_id):
        return

    socket_user = _get_socket_user(sid)
    if not socket_user:
        return

    await sio.emit(
        "presence_updated",
        {
            "sid": sid,
            "userId": str(socket_user["id"]),
            "cursorPosition": cursor_position,
            "color": _generate_user_color(socket_user["id"]),
        },
        room=f"project_{project_id}",
        skip_sid=sid,
    )
