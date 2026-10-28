from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routes.health import router as health_router
from app.routes.trips import router as trips_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("wanderwise.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="WanderWise AI - Personalized Travel Itinerary Planner REST API (Part 1)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for local development & production frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(trips_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "message": "Welcome to WanderWise AI - Personalized Travel Itinerary Planner API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
        "trips_endpoint": f"{settings.API_V1_PREFIX}/trips"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please check server logs."}
    )
