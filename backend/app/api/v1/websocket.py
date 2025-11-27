"""WebSocket server for real-time collaboration."""

from typing import Dict, Set

import socketio
from app.core.collision import validate_layout

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", logger=True, engineio_logger=False)

# Track active connections per project
# {project_id: {sid: {user_id, nickname, color}}}
active_rooms: Dict[int, Dict[str, dict]] = {}

# Track locked objects: {project_id: {furniture_id: sid}}
locked_objects: Dict[int, Dict[str, str]] = {}


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection."""
    print(f"Client {sid} connected")


@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    print(f"Client {sid} disconnected")

    # Remove from all rooms
    # Remove from all rooms
    for project_id, users in active_rooms.items():
        if sid in users:
            del users[sid]
            room = f"project_{project_id}"
            await sio.emit("user_left", {"sid": sid}, room=room, skip_sid=sid)

    # Release any locks held by this user
    for project_id, locks in locked_objects.items():
        locks_to_remove = []
        for furniture_id, lock_sid in locks.items():
            if lock_sid == sid:
                locks_to_remove.append(furniture_id)
        
        for furniture_id in locks_to_remove:
            del locks[furniture_id]
            room = f"project_{project_id}"
            await sio.emit("object_unlocked", {"furniture_id": furniture_id}, room=room)
            print(f"Auto-released lock on {furniture_id} for disconnected user {sid}")


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
    nickname = data.get("nickname", f"User {user_id}")
    color = data.get("color", "#cccccc")

    if not project_id:
        return

    room = f"project_{project_id}"
    await sio.enter_room(sid, room)

    # Track connection with user info
    if project_id not in active_rooms:
        active_rooms[project_id] = {}
    
    active_rooms[project_id][sid] = {
        "user_id": user_id,
        "nickname": nickname,
        "color": color,
        "sid": sid
    }

    print(f"User {nickname} ({user_id}) joined project {project_id}")

    # Notify others
    await sio.emit("user_joined", {
        "user_id": user_id,
        "nickname": nickname,
        "color": color,
        "sid": sid
    }, room=room, skip_sid=sid)

    # Send current users to the joining user
    current_users = list(active_rooms[project_id].values())
    await sio.emit("current_users", {"users": current_users}, to=sid)

    # Send current locks to the joining user
    current_locks = locked_objects.get(project_id, {})
    if current_locks:
        # Convert {furniture_id: sid} to list of {furniture_id, locked_by}
        locks_data = [{"furniture_id": k, "locked_by": v} for k, v in current_locks.items()]
        await sio.emit("current_locks", {"locks": locks_data}, to=sid)


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


@sio.event
async def request_lock(sid, data):
    """
    Handle request to lock an object.
    
    Args:
        sid: Socket ID
        data: Dict with project_id, furniture_id
    """
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")
    
    if not all([project_id, furniture_id]):
        return

    # Initialize project locks if needed
    if project_id not in locked_objects:
        locked_objects[project_id] = {}
        
    # Check if already locked by someone else
    current_lock = locked_objects[project_id].get(furniture_id)
    if current_lock and current_lock != sid:
        # Reject lock
        await sio.emit("lock_rejected", {"furniture_id": furniture_id, "locked_by": current_lock}, to=sid)
        return

    # Grant lock
    locked_objects[project_id][furniture_id] = sid
    room = f"project_{project_id}"
    
    # Notify everyone (including requester) that object is locked
    await sio.emit("object_locked", {"furniture_id": furniture_id, "locked_by": sid}, room=room)
    print(f"Lock granted on {furniture_id} to {sid}")


@sio.event
async def release_lock(sid, data):
    """
    Handle request to release a lock.
    
    Args:
        sid: Socket ID
        data: Dict with project_id, furniture_id
    """
    project_id = data.get("project_id")
    furniture_id = data.get("furniture_id")
    
    if not all([project_id, furniture_id]):
        return

    if project_id in locked_objects and furniture_id in locked_objects[project_id]:
        # Only allow owner to release
        if locked_objects[project_id][furniture_id] == sid:
            del locked_objects[project_id][furniture_id]
            room = f"project_{project_id}"
            await sio.emit("object_unlocked", {"furniture_id": furniture_id}, room=room)
            print(f"Lock released on {furniture_id} by {sid}")



