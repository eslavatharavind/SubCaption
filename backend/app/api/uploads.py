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


from fastapi import Request
from starlette.responses import StreamingResponse, Response, FileResponse


def find_project_video_file(project_id: str) -> Optional[str]:
    """Search for uploaded or processed video file across candidate storage directories"""
    curr_path = Path(__file__).resolve()
    candidates = [
        os.path.abspath(settings.TEMP_DIR),
        os.path.abspath("./temp"),
        os.path.abspath("./backend/temp"),
        str(curr_path.parents[2] / "temp"),
        str(curr_path.parents[3] / "temp") if len(curr_path.parents) > 3 else "",
        os.path.abspath(settings.REMOTION_RENDER_DIR),
        str(curr_path.parents[2] / "renders"),
    ]
    seen = set()
    for d in candidates:
        if not d or d in seen or not os.path.exists(d):
            continue
        seen.add(d)
        try:
            files = os.listdir(d)
        except Exception:
            continue

        # Priority 1: f"{project_id}_input.*"
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in settings.ALLOWED_VIDEO_FORMATS and f.startswith(f"{project_id}_input"):
                return os.path.join(d, f)

        # Priority 2: f"{project_id}_source.*" or f"{project_id}.*" or f"{project_id}_*"
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in settings.ALLOWED_VIDEO_FORMATS and (f.startswith(f"{project_id}.") or f.startswith(f"{project_id}_")):
                return os.path.join(d, f)

        # Priority 3: any video starting with project_id
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in settings.ALLOWED_VIDEO_FORMATS and f.startswith(project_id):
                return os.path.join(d, f)

    return None


@router.api_route("/projects/{project_id}/video", methods=["GET", "HEAD"])
async def get_project_video(project_id: str, request: Request):
    """
    Serve the project video file for streaming/preview with full HTTP 206 Byte-Range
    support for smooth, instant seeking in video players and browser media elements.
    """
    video_path = find_project_video_file(project_id)
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video file for project '{project_id}' not found in temporary storage"
        )

    ext = Path(video_path).suffix.lower()
    media_type = "video/mp4" if ext == ".mp4" else ("video/webm" if ext == ".webm" else "video/quicktime")
    file_size = os.path.getsize(video_path)

    headers = {
        "Content-Type": media_type,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Type",
    }

    range_header = request.headers.get("range")
    if not range_header:
        headers["Content-Length"] = str(file_size)
        if request.method == "HEAD":
            return Response(status_code=200, headers=headers)
        return FileResponse(video_path, media_type=media_type, headers=headers)

    # Range header present (e.g. "bytes=0-1000" or "bytes=5000-")
    try:
        h = range_header.strip().lower()
        if not h.startswith("bytes="):
            raise ValueError()
        range_val = h[6:]
        start_str, end_str = range_val.split("-", 1)
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        if end >= file_size:
            end = file_size - 1
        if start > end or start >= file_size:
            return Response(
                status_code=416,
                headers={
                    "Content-Range": f"bytes */{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Type": media_type,
                    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Type",
                }
            )

        content_length = end - start + 1
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        headers["Content-Length"] = str(content_length)

        if request.method == "HEAD":
            return Response(status_code=206, headers=headers)

        def file_iterator():
            with open(video_path, "rb") as f:
                f.seek(start)
                bytes_left = content_length
                chunk_size = 64 * 1024  # 64KB chunks
                while bytes_left > 0:
                    read_size = min(chunk_size, bytes_left)
                    chunk = f.read(read_size)
                    if not chunk:
                        break
                    bytes_left -= len(chunk)
                    yield chunk

        return StreamingResponse(
            file_iterator(),
            status_code=206,
            headers=headers
        )
    except Exception:
        headers["Content-Length"] = str(file_size)
        if request.method == "HEAD":
            return Response(status_code=200, headers=headers)
        return FileResponse(video_path, media_type=media_type, headers=headers)

