from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from typing import Optional
import os
import uuid
from pathlib import Path

from app.schemas.upload import UploadResponse, UploadProgress
from app.services.video.ffmpeg import ffmpeg_service
from app.core.security import get_current_user_optional, get_user_client
from app.utils.logging import get_logger
from app.core.config import settings

router = APIRouter()
logger = get_logger(__name__)


@router.post("/upload", response_model=UploadResponse)
async def direct_upload_video(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en"),
    project_id: Optional[str] = Form(None),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Upload a video file, validate type & size, and store temporarily in TEMP_DIR.
    Generates a unique project UUID if not provided.
    """
    if not project_id:
        project_id = str(uuid.uuid4())

    return await process_and_save_upload(project_id, file, language, current_user=current_user)


@router.post("/projects/{project_id}/upload", response_model=UploadResponse)
async def upload_video(
    project_id: str,
    file: UploadFile = File(...),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Upload video file for a specific project ID"""
    return await process_and_save_upload(project_id, file, current_user=current_user)


async def process_and_save_upload(
    project_id: str,
    file: UploadFile,
    language: Optional[str] = "en",
    current_user: Optional[dict] = None
) -> UploadResponse:
    """Core video validation and temporary storage handler"""

    logger.info("Processing video upload", project_id=project_id, filename=file.filename)

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_VIDEO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File format '{file_ext}' not supported. Allowed formats: {', '.join(settings.ALLOWED_VIDEO_FORMATS)}"
        )

    # Ensure temporary storage directory exists
    temp_dir = os.path.abspath(settings.TEMP_DIR)
    os.makedirs(temp_dir, exist_ok=True)

    # Destination path in temporary storage
    temp_video_path = os.path.join(temp_dir, f"{project_id}_input{file_ext}")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    file_size_bytes = 0

    try:
        # Stream read in 1MB chunks to validate file size & prevent memory overhead
        with open(temp_video_path, 'wb') as f:
            while chunk := await file.read(1024 * 1024):
                file_size_bytes += len(chunk)
                if file_size_bytes > max_bytes:
                    f.close()
                    if os.path.exists(temp_video_path):
                        os.remove(temp_video_path)
                    file_size_mb = file_size_bytes / (1024 * 1024)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File size ({file_size_mb:.2f} MB) exceeds maximum allowed limit ({settings.MAX_FILE_SIZE_MB} MB)"
                    )
                f.write(chunk)

        file_size_mb = file_size_bytes / (1024 * 1024)
        logger.info("Video saved to temporary directory", path=temp_video_path, size_mb=file_size_mb)

        # Attempt metadata extraction via FFmpeg (gracefully fallback if ffprobe unavailable)
        duration = None
        width = None
        height = None
        aspect_ratio = None
        try:
            metadata = await ffmpeg_service.get_video_metadata(temp_video_path)
            if metadata and metadata.get('success'):
                duration = metadata.get('duration')
                width = metadata.get('width')
                height = metadata.get('height')
                if width and height and width > 0 and height > 0:
                    ratios = [
                        ('9:16', 9 / 16),
                        ('4:5', 4 / 5),
                        ('1:1', 1 / 1),
                        ('4:3', 4 / 3),
                        ('16:9', 16 / 9),
                        ('21:9', 21 / 9)
                    ]
                    actual = width / height
                    closest = min(ratios, key=lambda r: abs(actual - r[1]))
                    aspect_ratio = closest[0]
        except Exception as probe_err:
            logger.warning("Could not extract video metadata", error=str(probe_err))

        # If user is authenticated, create or update project in Supabase
        if current_user:
            try:
                user_client = get_user_client(current_user["token"])
                user_client.table("projects").upsert({
                    "id": project_id,
                    "user_id": current_user["id"],
                    "name": Path(file.filename).stem or file.filename,
                    "language": language or "en",
                    "status": "uploaded",
                    "duration": duration,
                    "filename": file.filename,
                    "file_size": file_size_bytes
                }).execute()
                logger.info("Project record synced to Supabase", project_id=project_id, user_id=current_user["id"])
            except Exception as db_err:
                logger.warning("Could not persist project record to Supabase during upload", project_id=project_id, error=str(db_err))

        return UploadResponse(
            message="Video uploaded successfully",
            project_id=project_id,
            filename=file.filename,
            file_size=file_size_bytes,
            duration=duration,
            width=width,
            height=height,
            aspect_ratio=aspect_ratio
        )

    except HTTPException:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        raise
    except Exception as e:
        logger.error("Upload process failed", error=str(e))
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video upload failed: {str(e)}"
        )


@router.get("/projects/{project_id}/upload/status", response_model=UploadProgress)
async def get_upload_status(project_id: str):
    """Get upload status for project"""
    return UploadProgress(
        project_id=project_id,
        status="completed",
        progress=100.0,
        message="Upload completed"
    )


from fastapi.responses import FileResponse

@router.get("/projects/{project_id}/video")
async def get_project_video(project_id: str):
    """Serve the temporary video file for streaming/preview in the frontend video player"""
    temp_dir = os.path.abspath(settings.TEMP_DIR)
    if os.path.exists(temp_dir):
        for file_name in os.listdir(temp_dir):
            if file_name.startswith(f"{project_id}_input"):
                video_path = os.path.join(temp_dir, file_name)
                ext = Path(file_name).suffix.lower()
                media_type = "video/mp4" if ext == ".mp4" else ("video/webm" if ext == ".webm" else "video/quicktime")
                return FileResponse(video_path, media_type=media_type)
    raise HTTPException(status_code=404, detail="Video file not found in temporary storage")

