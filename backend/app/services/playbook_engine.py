"""
Playbook Execution Engine
Runs playbook steps asynchronously, emits progress events, persists state.
Each step type can be: auto (executes immediately) or manual (waits for confirmation).
"""
import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import Playbook, PlaybookStatus
from app.core.event_bus import event_bus, Events

logger = logging.getLogger(__name__)


# ── Step Definitions ──────────────────────────────────────────────────────────

PLAYBOOK_STEP_TEMPLATES = {
    "PB-01": {
        "name": "Credential Theft Response",
        "steps": [
            {"id": 1, "name": "Detect compromised accounts",        "type": "auto",   "duration": 3,  "action": "query_siem",         "description": "Query SIEM for anomalous authentication events"},
            {"id": 2, "name": "Disable affected user accounts",     "type": "auto",   "duration": 5,  "action": "disable_accounts",   "description": "Disable AD accounts showing compromise indicators"},
            {"id": 3, "name": "Revoke active sessions",             "type": "auto",   "duration": 2,  "action": "revoke_sessions",    "description": "Invalidate all active OAuth and session tokens"},
            {"id": 4, "name": "Force password reset",               "type": "auto",   "duration": 2,  "action": "force_reset",        "description": "Trigger mandatory password reset for affected accounts"},
            {"id": 5, "name": "Analyst review: confirm scope",      "type": "manual", "duration": 0,  "action": "manual_review",      "description": "Analyst must confirm the blast radius before continuing"},
            {"id": 6, "name": "Rotate service account credentials", "type": "auto",   "duration": 4,  "action": "rotate_svc_creds",   "description": "Rotate credentials for all service accounts in affected scope"},
            {"id": 7, "name": "Generate incident report",           "type": "auto",   "duration": 3,  "action": "gen_report",         "description": "Auto-generate DFIR incident report and notify stakeholders"},
        ]
    },
    "PB-02": {
        "name": "Ransomware Containment",
        "steps": [
            {"id": 1, "name": "Identify affected endpoints",        "type": "auto",   "duration": 4,  "action": "enumerate_endpoints","description": "Scan network for hosts showing ransomware behavioural patterns"},
            {"id": 2, "name": "Network quarantine — isolate hosts", "type": "auto",   "duration": 6,  "action": "network_quarantine", "description": "Push firewall rules to segment affected VLAN"},
            {"id": 3, "name": "Kill malicious processes",           "type": "auto",   "duration": 3,  "action": "kill_procs",         "description": "Terminate encryption-related processes via EDR"},
            {"id": 4, "name": "Preserve forensic images",           "type": "auto",   "duration": 8,  "action": "forensic_snapshot",  "description": "Capture memory and disk images before remediation"},
            {"id": 5, "name": "Analyst review: ransom note found",  "type": "manual", "duration": 0,  "action": "manual_review",      "description": "Confirm ransom note details and encryption scope"},
            {"id": 6, "name": "Block C2 communication channels",    "type": "auto",   "duration": 3,  "action": "block_c2",           "description": "Block all identified C2 IPs/domains at perimeter"},
            {"id": 7, "name": "Restore from clean backup",          "type": "auto",   "duration": 12, "action": "restore_backup",     "description": "Initiate restore from last known good backup"},
            {"id": 8, "name": "Analyst review: validate restore",   "type": "manual", "duration": 0,  "action": "manual_review",      "description": "Analyst must confirm restore integrity before reconnecting"},
            {"id": 9, "name": "Reconnect and monitor",              "type": "auto",   "duration": 5,  "action": "reconnect_monitor",  "description": "Re-admit host to network under enhanced monitoring"},
        ]
    },
    "PB-03": {
        "name": "Lateral Movement Quarantine",
        "steps": [
            {"id": 1, "name": "Map lateral movement path",          "type": "auto",   "duration": 5,  "action": "map_lm_path",        "description": "Trace pivot path using authentication logs and graph analysis"},
            {"id": 2, "name": "Block inter-segment traffic",        "type": "auto",   "duration": 4,  "action": "block_segments",     "description": "Apply micro-segmentation rules to affected network zones"},
            {"id": 3, "name": "Revoke Kerberos tickets (krbtgt)",   "type": "auto",   "duration": 3,  "action": "reset_krbtgt",       "description": "Reset krbtgt account twice to invalidate all Kerberos tickets"},
            {"id": 4, "name": "Analyst review: confirm pivot hosts","type": "manual", "duration": 0,  "action": "manual_review",      "description": "Analyst confirms all compromised pivot hosts are identified"},
            {"id": 5, "name": "Patch exploited vulnerabilities",    "type": "auto",   "duration": 6,  "action": "patch_vulns",        "description": "Deploy emergency patches to exploited services"},
            {"id": 6, "name": "Threat hunt for persistence",        "type": "auto",   "duration": 8,  "action": "threat_hunt",        "description": "Run automated threat hunt for backdoors and scheduled tasks"},
        ]
    },
    "PB-04": {
        "name": "C2 Traffic Disruption",
        "steps": [
            {"id": 1, "name": "Extract C2 IoCs from traffic",       "type": "auto",   "duration": 3,  "action": "extract_c2_iocs",    "description": "Parse PCAP and proxy logs to enumerate C2 indicators"},
            {"id": 2, "name": "Block IPs at perimeter firewall",    "type": "auto",   "duration": 4,  "action": "block_ips",          "description": "Push deny rules for all C2 IPs to edge firewall and NGFW"},
            {"id": 3, "name": "Sinkhole malicious domains",         "type": "auto",   "duration": 3,  "action": "sinkhole_domains",   "description": "Redirect C2 domains to internal sinkhole for traffic capture"},
            {"id": 4, "name": "Deploy DNS RPZ rules",               "type": "auto",   "duration": 2,  "action": "deploy_rpz",         "description": "Push Response Policy Zone rules to internal DNS resolvers"},
            {"id": 5, "name": "Validate disruption and monitor",    "type": "auto",   "duration": 4,  "action": "validate_disruption","description": "Confirm C2 traffic has ceased and enable enhanced DPI"},
        ]
    },
}


# ── Execution Engine ──────────────────────────────────────────────────────────

class PlaybookRunner:
    """Runs a single playbook instance asynchronously."""

    def __init__(self, playbook_db_id: int, playbook_id: str, db_factory):
        self.playbook_db_id = playbook_db_id
        self.playbook_id = playbook_id
        self.db_factory = db_factory
        self.template = PLAYBOOK_STEP_TEMPLATES.get(playbook_id, {})
        self.steps = self.template.get("steps", [])
        self._paused_event: Optional[asyncio.Event] = None
        self._cancelled = False
        self.current_step = 0

    async def run(self):
        """Main execution loop."""
        logger.info(f"PlaybookRunner starting: {self.playbook_id}")
        self._update_db_status(PlaybookStatus.running)

        await event_bus.publish(Events.PLAYBOOK_STARTED, {
            "playbook_id": self.playbook_id,
            "name": self.template.get("name"),
            "total_steps": len(self.steps),
        })

        try:
            for i, step in enumerate(self.steps):
                if self._cancelled:
                    break

                self.current_step = i + 1

                # Emit step-started event
                await event_bus.publish(Events.PLAYBOOK_STEP, {
                    "playbook_id": self.playbook_id,
                    "step_index": i,
                    "step": step,
                    "status": "running",
                    "progress_pct": round((i / len(self.steps)) * 100),
                })

                if step["type"] == "auto":
                    # Simulate work with slight jitter
                    duration = step["duration"] + random.uniform(-0.5, 1.0)
                    await asyncio.sleep(max(0.5, duration))
                    step_status = "completed"

                elif step["type"] == "manual":
                    # Wait for external confirmation (resume signal)
                    self._paused_event = asyncio.Event()
                    await event_bus.publish(Events.PLAYBOOK_STEP, {
                        "playbook_id": self.playbook_id,
                        "step_index": i,
                        "step": step,
                        "status": "awaiting_manual",
                        "progress_pct": round((i / len(self.steps)) * 100),
                    })
                    # Wait up to 5 minutes for analyst confirmation
                    try:
                        await asyncio.wait_for(self._paused_event.wait(), timeout=300)
                        step_status = "completed"
                    except asyncio.TimeoutError:
                        step_status = "skipped"
                    self._paused_event = None

                # Emit step-completed event
                await event_bus.publish(Events.PLAYBOOK_STEP, {
                    "playbook_id": self.playbook_id,
                    "step_index": i,
                    "step": step,
                    "status": step_status,
                    "progress_pct": round(((i + 1) / len(self.steps)) * 100),
                })

            if not self._cancelled:
                self._update_db_status(PlaybookStatus.completed)
                await event_bus.publish(Events.PLAYBOOK_COMPLETED, {
                    "playbook_id": self.playbook_id,
                    "name": self.template.get("name"),
                    "steps_completed": len(self.steps),
                })
            else:
                self._update_db_status(PlaybookStatus.failed)

        except Exception as e:
            logger.error(f"PlaybookRunner error [{self.playbook_id}]: {e}")
            self._update_db_status(PlaybookStatus.failed)
            await event_bus.publish(Events.PLAYBOOK_FAILED, {
                "playbook_id": self.playbook_id,
                "error": str(e),
            })

    def resume_manual_step(self):
        """Called by the API when an analyst approves a manual step."""
        if self._paused_event:
            self._paused_event.set()

    def cancel(self):
        self._cancelled = True
        if self._paused_event:
            self._paused_event.set()

    def _update_db_status(self, status: PlaybookStatus):
        try:
            db: Session = self.db_factory()
            pb = db.query(Playbook).filter(Playbook.id == self.playbook_db_id).first()
            if pb:
                pb.status = status
                db.commit()
            db.close()
        except Exception as e:
            logger.error(f"DB status update failed: {e}")


# ── Playbook Registry ─────────────────────────────────────────────────────────

class PlaybookRegistry:
    """Tracks all running playbook instances."""

    def __init__(self):
        self._runners: dict[str, PlaybookRunner] = {}

    def get_runner(self, playbook_id: str) -> Optional[PlaybookRunner]:
        return self._runners.get(playbook_id)

    async def execute(self, playbook_db_id: int, playbook_id: str, db_factory) -> PlaybookRunner:
        if playbook_id in self._runners:
            # Cancel existing if re-executing
            self._runners[playbook_id].cancel()

        runner = PlaybookRunner(playbook_db_id, playbook_id, db_factory)
        self._runners[playbook_id] = runner
        asyncio.create_task(runner.run())
        return runner

    def resume_step(self, playbook_id: str) -> bool:
        runner = self._runners.get(playbook_id)
        if runner:
            runner.resume_manual_step()
            return True
        return False

    def cancel(self, playbook_id: str) -> bool:
        runner = self._runners.get(playbook_id)
        if runner:
            runner.cancel()
            del self._runners[playbook_id]
            return True
        return False

    @property
    def running_ids(self) -> list[str]:
        return list(self._runners.keys())


# Singleton registry
playbook_registry = PlaybookRegistry()
