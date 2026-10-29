from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import time
from typing import Dict, Any

from .core.config import settings
from .utils.logging import setup_logging, get_logger
from .api import auth, projects, uploads, captions, templates, exports

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.error("Validation error", errors=exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# Root endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "timestamp": time.time()
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "supported_languages": settings.SUPPORTED_LANGUAGES
    }


# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["auth"])
app.include_router(projects.router, prefix=settings.API_PREFIX, tags=["projects"])
app.include_router(uploads.router, prefix=settings.API_PREFIX, tags=["uploads"])
app.include_router(captions.router, prefix=settings.API_PREFIX, tags=["captions"])
app.include_router(templates.router, prefix=settings.API_PREFIX, tags=["templates"])
app.include_router(exports.router, prefix=settings.API_PREFIX, tags=["exports"])


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info(
        "Application starting",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT
    )


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Application shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
