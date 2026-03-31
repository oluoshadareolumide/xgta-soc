"""
WebSocket Connection Manager
Manages all active WebSocket connections and broadcasts events to subscribers.
"""
import asyncio
import json
import logging
from typing import Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # active_connections: dict of user_id -> list of WebSocket
        self.active_connections: dict[int, list[WebSocket]] = {}
        # broadcast connections (not user-specific)
        self.broadcast_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        else:
            self.broadcast_connections.append(websocket)
        logger.info(f"WS connected: user_id={user_id}, total={self.total_connections}")

    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        elif websocket in self.broadcast_connections:
            self.broadcast_connections.remove(websocket)
        logger.info(f"WS disconnected: user_id={user_id}, total={self.total_connections}")

    @property
    def total_connections(self) -> int:
        user_conns = sum(len(v) for v in self.active_connections.values())
        return user_conns + len(self.broadcast_connections)

    async def send_to_user(self, user_id: int, message: dict):
        """Send a message to all WebSockets for a specific user."""
        if user_id not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections[user_id].remove(ws)

    async def broadcast(self, message: dict):
        """Broadcast to all connected clients."""
        payload = json.dumps(message, default=str)
        dead_broadcast = []
        for ws in self.broadcast_connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_broadcast.append(ws)
        for ws in dead_broadcast:
            self.broadcast_connections.remove(ws)

        # Also send to all user connections
        dead_user: list[tuple[int, WebSocket]] = []
        for user_id, connections in self.active_connections.items():
            for ws in connections:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_user.append((user_id, ws))
        for user_id, ws in dead_user:
            if user_id in self.active_connections:
                self.active_connections[user_id] = [
                    c for c in self.active_connections[user_id] if c != ws
                ]

    async def broadcast_event(self, event_type: str, data: dict):
        """Broadcast a typed event envelope."""
        await self.broadcast({"type": event_type, "data": data})


# Singleton instance
manager = ConnectionManager()
