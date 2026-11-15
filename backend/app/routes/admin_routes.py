from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional, Dict, Any

from backend.app.middleware.auth import get_current_admin
from backend.app.schemas.schemas import (
    AdminDashboardSummary,
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    FacultyCreateRequest,
    FacultyUpdateRequest,
    FacultyResponse
)
from backend.app.controllers.admin_controller import (
    get_admin_dashboard_summary,
    get_all_courses_admin,
    create_course_admin,
    update_course_admin,
    delete_course_admin,
    toggle_course_registration,
    get_waitlist_by_course,
    get_all_activity_logs,
    create_faculty_admin,
    list_faculty_admin,
    update_faculty_admin,
    resend_faculty_credentials_admin,
    admin_delete_enrollment
)
from backend.app.services.waitlist import (
    get_admin_waitlist_overview,
    admin_manual_release_seat,
    admin_remove_waitlist_entry
)

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/dashboard", response_model=AdminDashboardSummary)
async def get_dashboard(current_admin: dict = Depends(get_current_admin)):
    return await get_admin_dashboard_summary()

@router.get("/courses")
async def list_courses(
    department: Optional[str] = Query(None, description="Department filter"),
    status: Optional[str] = Query(None, description="Status filter (open/closed/full)"),
    search: Optional[str] = Query(None, description="Search course code or name"),
    current_admin: dict = Depends(get_current_admin)
):
    return await get_all_courses_admin(department, status, search)

@router.post("/courses")
async def create_course(
    course: CourseCreate,
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await create_course_admin(course, admin_id)

@router.put("/courses/{course_code}")
async def update_course(
    course_code: str = Path(..., description="Course code to update"),
    course_update: CourseUpdate = ...,
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await update_course_admin(course_code, course_update, admin_id)

@router.delete("/courses/{course_code}")
async def delete_course(
    course_code: str = Path(..., description="Course code to delete"),
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await delete_course_admin(course_code, admin_id)

@router.post("/courses/{course_code}/toggle-status")
async def toggle_status(
    course_code: str = Path(..., description="Course code to toggle"),
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await toggle_course_registration(course_code, admin_id)

@router.get("/waitlists")
async def list_waitlists(current_admin: dict = Depends(get_current_admin)):
    return await get_admin_waitlist_overview()

@router.post("/waitlists/{course_code}/release")
async def release_waitlist_seat(
    course_code: str = Path(..., description="Course code to release seat for"),
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await admin_manual_release_seat(course_code, admin_id)

@router.delete("/waitlists/{course_code}/entries/{student_id}")
async def remove_waitlist_entry_admin(
    course_code: str = Path(..., description="Course code"),
    student_id: str = Path(..., description="Student ID to remove"),
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await admin_remove_waitlist_entry(course_code, student_id, admin_id)

@router.delete("/courses/{course_code}/enrollments/{student_id}")
async def delete_student_enrollment(
    course_code: str = Path(..., description="Course code"),
    student_id: str = Path(..., description="Student ID to unenroll"),
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await admin_delete_enrollment(course_code, student_id, admin_id)

@router.get("/courses/{course_code}/waitlist")
async def get_course_waitlist(
    course_code: str = Path(..., description="Course code to inspect waitlist"),
    current_admin: dict = Depends(get_current_admin)
):
    return await get_waitlist_by_course(course_code)

@router.get("/logs")
async def get_logs(
    limit: int = Query(50, ge=1, le=200),
    current_admin: dict = Depends(get_current_admin)
):
    return await get_all_activity_logs(limit)

@router.post("/faculty")
async def create_faculty(
    payload: FacultyCreateRequest,
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await create_faculty_admin(payload, admin_id)

@router.get("/faculty")
async def list_faculty(
    current_admin: dict = Depends(get_current_admin)
):
    return await list_faculty_admin()

@router.patch("/faculty/{faculty_id}")
async def update_faculty(
    faculty_id: str = Path(..., description="Faculty ID"),
    payload: FacultyUpdateRequest = ...,
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await update_faculty_admin(faculty_id, payload, admin_id)

@router.post("/faculty/{faculty_id}/resend-credentials")
async def resend_credentials(
    faculty_id: str = Path(..., description="Faculty ID"),
    current_admin: dict = Depends(get_current_admin)
):
    admin_id = current_admin.get("email") or current_admin.get("student_id")
    return await resend_faculty_credentials_admin(faculty_id, admin_id)


