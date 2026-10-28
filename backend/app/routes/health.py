from datetime import datetime
from fastapi import APIRouter
from app.config import settings
from app.database import db
from app.schemas.trip import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Health check endpoint returning system status, database storage mode,
    Supabase connection state, and active AI provider/model configuration.
    """
    status_info = db.get_status_info()
    return HealthResponse(
        status="healthy",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        database_mode=status_info["mode"],
        supabase_connected=status_info["supabase_configured"],
        ai_configured=settings.is_ai_configured,
        ai_provider=settings.active_provider,
        ai_model=settings.active_model,
        timestamp=datetime.utcnow().isoformat()
    )
