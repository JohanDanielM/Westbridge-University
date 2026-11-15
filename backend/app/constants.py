from typing import List, Dict

STREAMS: List[Dict[str, str]] = [
    {"code": "CS", "name": "Computer Science"},
    {"code": "SE", "name": "Software Engineering"},
    {"code": "DS", "name": "Data Science"},
    {"code": "AI", "name": "Artificial Intelligence"},
    {"code": "CY", "name": "Cybersecurity"},
]

CURRENT_TERM = "Fall 2026"
ADMISSION_YEAR = 2026

FACULTY_PERMISSIONS: Dict[str, str] = {
    "view_roster": "View student rosters",
    "enter_grades": "Enter grades",
    "manage_course": "Edit own course details"
}

DEFAULT_FACULTY_PERMISSIONS: List[str] = ["view_roster", "manage_course"]
