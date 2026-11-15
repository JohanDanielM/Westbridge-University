import re
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger("ccrs.schedule")

DAY_MAP = {
    "MON": "Mon", "MONDAY": "Mon",
    "TUE": "Tue", "TUES": "Tue", "TUESDAY": "Tue",
    "WED": "Wed", "WEDNESDAY": "Wed",
    "THU": "Thu", "THUR": "Thu", "THURS": "Thu", "THURSDAY": "Thu",
    "FRI": "Fri", "FRIDAY": "Fri",
    "SAT": "Sat", "SATURDAY": "Sat",
    "SUN": "Sun", "SUNDAY": "Sun",
}

VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

def _to_24h(hour: int, minute: int, mer: Optional[str]) -> Tuple[int, int]:
    if mer:
        mer = mer.upper()
        if mer == "PM" and hour < 12:
            hour += 12
        elif mer == "AM" and hour == 12:
            hour = 0
    else:
        # Default heuristic: university classes typically start 8:00 AM to 7:00 PM
        if hour < 7:
            hour += 12
    return hour, minute

def _format_time(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"

def parse_schedule(schedule_str: str) -> List[Dict[str, str]]:
    if not schedule_str or not isinstance(schedule_str, str):
        return []
    
    clean_str = schedule_str.strip()
    if clean_str.upper() in ["TBA", "ONLINE", "ARRANGED", "NONE", "N/A", ""]:
        return []

    try:
        # Replace en-dash (\u2013), em-dash (\u2014) with hyphen
        normalized = clean_str.replace("–", "-").replace("—", "-")
        # Normalize spaces
        normalized = re.sub(r"\s+", " ", normalized).strip()

        # Extract days: find all day tokens before the first digit
        match = re.search(r"\d", normalized)
        if not match:
            logger.warning(f"Could not parse schedule time digits: '{schedule_str}'")
            return []
        
        digit_idx = match.start()
        day_part = normalized[:digit_idx].strip()
        time_part = normalized[digit_idx:].strip()

        # Find matching days
        found_days = []
        for word in re.split(r"[,/&\s]+", day_part):
            w = word.strip().upper()
            if w in DAY_MAP:
                day_name = DAY_MAP[w]
                if day_name not in found_days:
                    found_days.append(day_name)
        
        if not found_days:
            logger.warning(f"Could not parse schedule days from: '{day_part}' in '{schedule_str}'")
            return []

        # Parse times in time_part
        # Format can be:
        # 1) "10:00 - 11:30 AM" or "10:00 AM - 11:30 AM" or "02:00 - 03:30 PM"
        # 2) "10:00 AM" (single time)
        # 3) "10:00-11:30"
        time_range_match = re.match(
            r"^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$",
            time_part,
            re.IGNORECASE
        )
        single_time_match = re.match(
            r"^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$",
            time_part,
            re.IGNORECASE
        )

        if time_range_match:
            sh_str, sm_str, smer, eh_str, em_str, emer = time_range_match.groups()
            sh = int(sh_str)
            sm = int(sm_str) if sm_str else 0
            eh = int(eh_str)
            em = int(em_str) if em_str else 0

            # If start doesn't have AM/PM but end does, infer start's AM/PM
            if not smer and emer:
                # If end is PM and start hour is <= end hour, or start > end (e.g. 11:30 - 1:00 PM -> start is AM)
                if emer.upper() == "PM":
                    if sh == 12 or sh < eh:
                        smer = "PM"
                    else:
                        smer = "AM"
                else:
                    smer = emer

            start_h, start_m = _to_24h(sh, sm, smer)
            end_h, end_m = _to_24h(eh, em, emer)

            start_str = _format_time(start_h, start_m)
            end_str = _format_time(end_h, end_m)
        elif single_time_match:
            sh_str, sm_str, smer = single_time_match.groups()
            sh = int(sh_str)
            sm = int(sm_str) if sm_str else 0
            start_h, start_m = _to_24h(sh, sm, smer)
            start_str = _format_time(start_h, start_m)
            # Default end is start + 60 min
            end_total = start_h * 60 + start_m + 60
            end_h = (end_total // 60) % 24
            end_m = end_total % 60
            end_str = _format_time(end_h, end_m)
        else:
            logger.warning(f"Could not parse schedule time range: '{time_part}' in '{schedule_str}'")
            return []

        sessions = []
        for d in found_days:
            sessions.append({
                "day": d,
                "start": start_str,
                "end": end_str
            })
        return sessions
    except Exception as exc:
        logger.warning(f"Unexpected error parsing schedule '{schedule_str}': {exc}")
        return []

def check_session_conflict(s1: Dict[str, str], s2: Dict[str, str]) -> bool:
    """Checks whether two sessions overlap on the same day."""
    if s1.get("day") != s2.get("day"):
        return False
    # Format is "HH:MM" so string comparison works accurately
    return max(s1["start"], s2["start"]) < min(s1["end"], s2["end"])

def find_conflicts(sessions: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Returns list of conflict descriptions between pairs of sessions."""
    conflicts = []
    n = len(sessions)
    for i in range(n):
        for j in range(i + 1, n):
            s1 = sessions[i]
            s2 = sessions[j]
            if s1.get("code") and s2.get("code") and s1["code"] == s2["code"]:
                continue
            if check_session_conflict(s1, s2):
                conflicts.append({
                    "course_a": s1.get("code", "Course A"),
                    "course_b": s2.get("code", "Course B"),
                    "day": s1["day"],
                    "time_a": f"{s1['start']}–{s1['end']}",
                    "time_b": f"{s2['start']}–{s2['end']}",
                    "message": f"Conflicts with {s2.get('code', 'course')} on {s1['day']} {s2['start']}."
                })
    return conflicts
