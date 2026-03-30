"""
WebSocket API Router
Provides the /ws endpoint that the frontend connects to for live events.
Also publishes system stats every 10 seconds.
"""
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.websockets import WebSocketState

from app.core.websocket_manager import manager
from app.core.event_bus import event_bus, Events
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    """
    Main WebSocket endpoint.
    Client connects with: ws://localhost:8000/ws?token=<jwt>
    All live events are broadcast here.
    """
    # Validate token (optional — unauthenticated gets broadcast-only)
    user_id = None
    if token:
        token_data = decode_access_token(token)
        if token_data:
            user_id = token_data.user_id

    await manager.connect(websocket, user_id)

    # Send immediate welcome with connection stats
    await websocket.send_json({
        "type": "connection.established",
        "data": {
            "user_id": user_id,
            "total_connections": manager.total_connections,
            "message": "Connected to XGTA-SOC live event stream",
        }
    })

    try:
        while True:
            # Keep alive: wait for client ping or disconnect
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                # Handle client messages (e.g., ping/pong, manual step confirmations)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send server-side keepalive
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"WebSocket disconnected: user_id={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)


async def broadcast_events_from_bus():
    """
    Bridge: subscribes to the event bus and broadcasts all events
    to all connected WebSocket clients.
    Called once at startup.
    """
    async def handler(event: dict):
        await manager.broadcast(event)

    event_bus.subscribe_all(handler)


async def run_stats_broadcaster(db_factory):
    """Broadcasts system stats every 10 seconds."""
    while True:
        await asyncio.sleep(10)
        try:
            db = db_factory()
            from app.services.alert_service import get_alert_stats
            stats = get_alert_stats(db)
            db.close()
            await event_bus.publish(Events.SYSTEM_STATS, {
                "connections": manager.total_connections,
                **stats,
            })
        except Exception as e:
            logger.error(f"Stats broadcaster error: {e}")
