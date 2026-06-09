"""API route modules."""

from app.api.articles import router as articles_router
from app.api.debates import router as debates_router
from app.api.health import router as health_router

__all__ = ["articles_router", "debates_router", "health_router"]
