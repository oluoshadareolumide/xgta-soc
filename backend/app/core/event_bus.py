"""
Async Event Bus
Decouples event producers (services) from consumers (WebSocket broadcaster).
Services call `event_bus.publish(event_type, data)` — the WS layer subscribes.
"""
import asyncio
import logging
from collections import defaultdict
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)

EventHandler = Callable[[dict], Awaitable[None]]


class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[EventHandler]] = defaultdict(list)
        self._queue: asyncio.Queue = asyncio.Queue()
        self._running = False

    def subscribe(self, event_type: str, handler: EventHandler):
        self._subscribers[event_type].append(handler)

    def subscribe_all(self, handler: EventHandler):
        """Subscribe to every event type using wildcard key '*'."""
        self._subscribers["*"].append(handler)

    async def publish(self, event_type: str, data: dict):
        """Put an event on the queue (non-blocking, safe from sync context via asyncio.create_task)."""
        await self._queue.put({"type": event_type, "data": data})

    def publish_sync(self, event_type: str, data: dict):
        """Publish from synchronous context — schedules on the running loop."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.publish(event_type, data))
        except RuntimeError:
            pass  # No event loop — skip (e.g., during testing)

    async def start(self):
        """Consume the queue and dispatch to subscribers."""
        self._running = True
        logger.info("EventBus started")
        while self._running:
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                event_type = event["type"]
                data = event["data"]
                handlers = self._subscribers.get(event_type, []) + self._subscribers.get("*", [])
                for handler in handlers:
                    try:
                        await handler(event)
                    except Exception as e:
                        logger.error(f"EventBus handler error [{event_type}]: {e}")
                self._queue.task_done()
            except asyncio.TimeoutError:
                continue

    def stop(self):
        self._running = False


# Singleton
event_bus = EventBus()


# ── Event type constants ───────────────────────────────────────────────────────

class Events:
    # Alerts
    ALERT_CREATED    = "alert.created"
    ALERT_UPDATED    = "alert.updated"
    ALERT_DELETED    = "alert.deleted"
    ALERT_CRITICAL   = "alert.critical"

    # Playbooks
    PLAYBOOK_STARTED    = "playbook.started"
    PLAYBOOK_STEP       = "playbook.step"
    PLAYBOOK_COMPLETED  = "playbook.completed"
    PLAYBOOK_FAILED     = "playbook.failed"

    # IOCs
    IOC_CREATED = "ioc.created"
    IOC_HIT     = "ioc.hit"

    # System
    SYSTEM_STATS = "system.stats"
    THREAT_FEED  = "threat.feed"
