"""
Alert Simulator
Generates realistic security alerts at random intervals for demo / dev purposes.
Controlled by APP_ENV — only runs when SIMULATE_ALERTS=true in .env.
"""
import asyncio
import random
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.event_bus import event_bus, Events
from app.models.models import Alert, SeverityLevel, AlertStatus, ThreatActor
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

ALERT_TEMPLATES = [
    {"title": "Lateral Movement Detected",           "severity": "critical", "technique": "T1078 – Valid Accounts",          "ioc_count": (8, 18)},
    {"title": "Credential Dumping via LSASS",        "severity": "high",     "technique": "T1003 – OS Credential Dumping",   "ioc_count": (4, 12)},
    {"title": "Suspicious PowerShell Execution",     "severity": "high",     "technique": "T1059 – Command Scripting",       "ioc_count": (3, 8)},
    {"title": "DNS Beaconing Pattern",               "severity": "medium",   "technique": "T1071 – App Layer Protocol",      "ioc_count": (1, 5)},
    {"title": "Ransomware Pre-Stage Activity",       "severity": "critical", "technique": "T1486 – Data Encrypted",          "ioc_count": (12, 25)},
    {"title": "Kerberoasting Attack",                "severity": "high",     "technique": "T1558 – Steal/Forge Tickets",     "ioc_count": (5, 10)},
    {"title": "Data Exfiltration to External IP",   "severity": "critical", "technique": "T1041 – Exfil over C2",           "ioc_count": (6, 20)},
    {"title": "Scheduled Task Created",              "severity": "medium",   "technique": "T1053 – Scheduled Task/Job",      "ioc_count": (1, 3)},
    {"title": "Registry Run Key Modification",      "severity": "medium",   "technique": "T1547 – Boot/Logon Autostart",    "ioc_count": (2, 5)},
    {"title": "Unusual LSASS Memory Access",         "severity": "high",     "technique": "T1003.001 – LSASS Memory",        "ioc_count": (3, 9)},
]


async def _generate_alert():
    """Create one synthetic alert and publish it."""
    db: Session = SessionLocal()
    try:
        template = random.choice(ALERT_TEMPLATES)
        actors = db.query(ThreatActor).filter(ThreatActor.is_active == True).all()

        from app.services.alert_service import _next_alert_id
        alert = Alert(
            alert_id=_next_alert_id(db),
            title=template["title"],
            severity=template["severity"],
            status=AlertStatus.open,
            technique=template["technique"],
            ioc_count=random.randint(*template["ioc_count"]),
            confidence=random.uniform(60, 97),
            threat_actor_id=random.choice(actors).id if actors else None,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        event_data = {
            "id": alert.id,
            "alert_id": alert.alert_id,
            "title": alert.title,
            "severity": alert.severity.value if hasattr(alert.severity, 'value') else alert.severity,
            "status": alert.status.value if hasattr(alert.status, 'value') else alert.status,
            "technique": alert.technique,
            "ioc_count": alert.ioc_count,
            "confidence": round(alert.confidence, 1),
            "threat_actor_id": alert.threat_actor_id,
            "created_at": alert.created_at.isoformat(),
        }

        await event_bus.publish(Events.ALERT_CREATED, event_data)

        # Emit critical event separately for urgent UI notification
        if alert.severity in (SeverityLevel.critical, "critical"):
            await event_bus.publish(Events.ALERT_CRITICAL, event_data)

        logger.info(f"Simulated alert: {alert.alert_id} [{alert.severity}]")
    except Exception as e:
        logger.error(f"Alert simulation error: {e}")
    finally:
        db.close()


async def run_alert_simulator(interval_min: int = 15, interval_max: int = 45):
    """
    Continuously generates alerts at random intervals.
    interval_min/max are in seconds for development; set higher for production demo.
    """
    logger.info(f"Alert simulator started (interval: {interval_min}–{interval_max}s)")
    while True:
        wait = random.randint(interval_min, interval_max)
        await asyncio.sleep(wait)
        await _generate_alert()
