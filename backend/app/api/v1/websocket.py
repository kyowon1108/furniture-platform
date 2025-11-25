"""WebSocket server for real-time collaboration."""

from typing import Dict, Set

import socketio
from app.core.collision import validate_layout

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", logger=True, engineio_logger=False)

# Track active connections per project
active_rooms: Dict[int, Set[str]] = {}


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection."""
    print(f"Client {sid} connected")


@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    print(f"Client {sid} disconnected")

    # Remove from all rooms
    for project_id, sids in active_rooms.items():
        if sid in sids:
            sids.remove(sid)
            room = f"project_{project_id}"
            await sio.emit("user_left", {"sid": sid}, room=room, skip_sid=sid)


@sio.event
async def join_project(sid, data):
    """
    Handle user joining a project room.

    Args:
        sid: Socket ID
        data: Dict with project_id and user_id
    """
    project_id = data.get("project_id")
    user_id = data.get("user_id")

    if not project_id:
        return

    room = f"project_{project_id}"
    await sio.enter_room(sid, room)

    # Track connection
    if project_id not in active_rooms:
        active_rooms[project_id] = set()
    active_rooms[project_id].add(sid)

    print(f"User {user_id} (sid: {sid}) joined project {project_id}")

    # Notify others
    await sio.emit("user_joined", {"user_id": user_id, "sid": sid}, room=room, skip_sid=sid)


@sio.event
async def furniture_move(sid, data):
    """
    Handle furniture movement.

    Args:
        sid: Socket ID
        data: Dict with project_id, furniture_id, position, rotation
    """
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")
    position = data.get("position")
    rotation = data.get("rotation")

    if not all([project_id, furniture_id, position]):
        return

    room = f"project_{project_id}"

    # Broadcast to others in the room
    await sio.emit(
        "furniture_updated",
        {"furniture_id": furniture_id, "position": position, "rotation": rotation},
        room=room,
        skip_sid=sid,
    )


@sio.event
async def furniture_add(sid, data):
    """
    Handle furniture addition.

    Args:
        sid: Socket ID
        data: Dict with project_id and furniture object
    """
    project_id = data.get("project_id")
    furniture = data.get("furniture")

    if not all([project_id, furniture]):
        return

    room = f"project_{project_id}"

    # Broadcast to others
    await sio.emit("furniture_added", {"furniture": furniture}, room=room, skip_sid=sid)


@sio.event
async def furniture_delete(sid, data):
    """
    Handle furniture deletion.

    Args:
        sid: Socket ID
        data: Dict with project_id and furniture_id
    """
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")

    if not all([project_id, furniture_id]):
        return

    room = f"project_{project_id}"

    # Broadcast to others
    await sio.emit("furniture_deleted", {"furniture_id": furniture_id}, room=room, skip_sid=sid)


@sio.event
async def validate_furniture(sid, data):
    """
    Validate furniture layout and send results.

    Args:
        sid: Socket ID
        data: Dict with project_id, furniture_state, room_dimensions
    """
    project_id = data.get("project_id")
    furniture_state = data.get("furniture_state")
    room_dimensions = data.get("room_dimensions")

    if not all([project_id, furniture_state, room_dimensions]):
        return

    # Validate layout
    result = validate_layout(furniture_state, room_dimensions)

    # Send result to requesting client
    await sio.emit("validation_result", result, to=sid)

    # If there are collisions, broadcast to room
    if not result["valid"]:
        room = f"project_{project_id}"
        await sio.emit(
            "collision_detected",
            {"collisions": result["collisions"], "out_of_bounds": result["out_of_bounds"]},
            room=room,
        )
