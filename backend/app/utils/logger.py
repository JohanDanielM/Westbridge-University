import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from backend.app.database import get_activity_logs_collection

logger = logging.getLogger("ccrs.activity")

async def log_activity(
    action: str,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """
    Asynchronously write an audit / activity log entry to the activity_logs collection.
    """
    try:
        activity_coll = get_activity_logs_collection()
        entry = {
            "action": action,
            "user_id": user_id or "anonymous",
            "user_role": user_role or "unknown",
            "details": details or {},
            "timestamp": datetime.now(timezone.utc)
        }
        await activity_coll.insert_one(entry)
        logger.info(f"Activity logged: [{action}] by user '{user_id}'")
    except Exception as e:
        logger.error(f"Failed to record activity log: {e}")

