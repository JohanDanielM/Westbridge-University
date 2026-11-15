from fastapi import APIRouter
from backend.app.constants import STREAMS, CURRENT_TERM, ADMISSION_YEAR

router = APIRouter(prefix="/meta", tags=["Metadata"])

@router.get("/streams")
async def get_streams():
    return STREAMS

@router.get("/term")
async def get_term():
    return {
        "term": CURRENT_TERM,
        "admission_year": ADMISSION_YEAR
    }
