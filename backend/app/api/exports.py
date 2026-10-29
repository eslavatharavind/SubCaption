from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
import uuid
import asyncio
from ..schemas.export import ExportRequest, ExportJob, ExportProgress, ExportStatus, Resolution
from ..services.video.ffmpeg import ffmpeg_service
from ..services.cleanup.temporary_files import cleanup_service
from ..core.security import get_current_user_optional, get_user_client, supabase
from ..api.captions import PROJECT_CAPTIONS
from ..utils.logging import get_logger
from ..core.config import settings

router = APIRouter()
logger = get_logger(__name__)

# In-memory store for export job status
EXPORT_JOBS: Dict[str, Dict[str, Any]] = {}


async def run_video_export(
    export_id: str,
    project_id: str,
    resolution: str,
    text_layers: Optional[List[Dict[str, Any]]] = None,
    segments: Optional[List[Dict[str, Any]]] = None,
    template_config: Optional[Dict[str, Any]] = None,
    aspect_ratio: Optional[str] = "9:16"
):
    """Background task to render captions into final MP4 video"""
    try:
        EXPORT_JOBS[export_id] = {
            "id": export_id,
            "project_id": project_id,
            "status": ExportStatus.PROCESSING.value,
            "progress": 10.0,
            "message": "Preparing video and subtitle assets...",
            "output_format": "mp4",
            "resolution": resolution,
            "download_url": None,
            "output_path": None
        }

        # Update status in Supabase if valid UUID
        try:
            uuid.UUID(str(export_id))
            supabase.table("exports").update({
                "status": ExportStatus.PROCESSING.value
            }).eq("id", export_id).execute()
        except Exception:
            pass

        # Locate temporary source video file
        temp_dir = os.path.abspath(settings.TEMP_DIR)
        video_files = [f for f in os.listdir(temp_dir) if f.startswith(project_id) and f.endswith(('.mp4', '.mov', '.webm'))]

        if not video_files:
            EXPORT_JOBS[export_id]["status"] = ExportStatus.FAILED.value
            EXPORT_JOBS[export_id]["message"] = "Source video file not found in temporary storage"
            try:
                uuid.UUID(str(export_id))
                supabase.table("exports").update({"status": ExportStatus.FAILED.value}).eq("id", export_id).execute()
            except Exception:
                pass
            return

        input_video_path = os.path.join(temp_dir, video_files[0])
        if not segments:
            segments = PROJECT_CAPTIONS.get(project_id, [])

        def update_export_progress(pct: float, msg: str):
            if export_id in EXPORT_JOBS:
                EXPORT_JOBS[export_id]["progress"] = round(pct, 1)
                EXPORT_JOBS[export_id]["message"] = msg

        # Call FFmpeg render service with real-time progress reporting
        render_res = await ffmpeg_service.render_burned_captions(
            project_id,
            input_video_path,
            segments,
            export_id,
            text_layers=text_layers,
            template_config=template_config,
            aspect_ratio=aspect_ratio,
            progress_callback=update_export_progress
        )

        if render_res.get("success"):
            out_path = render_res.get("output_path")
            download_url = f"/api/exports/{export_id}/download"
            EXPORT_JOBS[export_id].update({
                "status": ExportStatus.COMPLETED.value,
                "progress": 100.0,
                "message": "Export completed successfully",
                "download_url": download_url,
                "output_path": out_path
            })
            logger.info("Export completed", export_id=export_id, path=out_path)
            try:
                uuid.UUID(str(export_id))
                supabase.table("exports").update({
                    "status": ExportStatus.COMPLETED.value,
                    "completed_at": datetime.utcnow().isoformat(),
                    "download_url": download_url
                }).eq("id", export_id).execute()
            except Exception as up_err:
                logger.warning("Could not update export completion in Supabase", error=str(up_err))
        else:
            EXPORT_JOBS[export_id].update({
                "status": ExportStatus.FAILED.value,
                "message": f"Export rendering failed: {render_res.get('error', 'Unknown error')}"
            })
            try:
                uuid.UUID(str(export_id))
                supabase.table("exports").update({"status": ExportStatus.FAILED.value}).eq("id", export_id).execute()
            except Exception:
                pass

    except Exception as e:
        logger.error("Video export task failed", export_id=export_id, error=str(e))
        EXPORT_JOBS[export_id] = {
            "id": export_id,
            "project_id": project_id,
            "status": ExportStatus.FAILED.value,
            "progress": 0.0,
            "message": f"Export error: {str(e)}"
        }
        try:
            uuid.UUID(str(export_id))
            supabase.table("exports").update({"status": ExportStatus.FAILED.value}).eq("id", export_id).execute()
        except Exception:
            pass


@router.post("/projects/{project_id}/export", response_model=ExportJob, status_code=status.HTTP_201_CREATED)
async def create_export(
    project_id: str,
    export_data: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Create and trigger video export job for project"""

    export_id = str(uuid.uuid4())
    logger.info("Creating export job", project_id=project_id, export_id=export_id, resolution=export_data.resolution)

    res_str = export_data.resolution.value if hasattr(export_data.resolution, 'value') else str(export_data.resolution)
    now_dt = datetime.utcnow()

    # Initialize job state
    EXPORT_JOBS[export_id] = {
        "id": export_id,
        "project_id": project_id,
        "status": ExportStatus.PENDING.value,
        "progress": 5.0,
        "message": "Export task queued...",
        "output_format": export_data.output_format or "mp4",
        "resolution": res_str,
        "download_url": None
    }

    # Record in Supabase
    try:
        uuid.UUID(str(project_id))
        client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase
        client.table("exports").insert({
            "id": export_id,
            "project_id": project_id,
            "status": ExportStatus.PENDING.value,
            "output_format": export_data.output_format or "mp4",
            "resolution": res_str,
            "download_url": None
        }).execute()
        logger.info("Export record saved to Supabase", export_id=export_id)
    except Exception as db_err:
        logger.warning("Could not persist export record to Supabase", export_id=export_id, error=str(db_err))

    # Queue background export task
    background_tasks.add_task(
        run_video_export,
        export_id,
        project_id,
        EXPORT_JOBS[export_id]["resolution"],
        export_data.text_layers,
        export_data.segments,
        export_data.template_config,
        export_data.aspect_ratio or "9:16"
    )

    return {
        "id": export_id,
        "project_id": project_id,
        "status": ExportStatus.PENDING,
        "output_format": export_data.output_format or "mp4",
        "resolution": res_str,
        "download_url": None,
        "created_at": now_dt,
        "completed_at": None
    }


@router.get("/exports/{export_id}", response_model=ExportJob)
async def get_export(export_id: str, current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Get export job details"""

    job = EXPORT_JOBS.get(export_id)
    if job:
        return {
            "id": export_id,
            "project_id": job["project_id"],
            "status": job["status"],
            "output_format": job.get("output_format", "mp4"),
            "resolution": job.get("resolution", "1080p"),
            "download_url": job.get("download_url"),
            "created_at": datetime.utcnow(),
            "completed_at": datetime.utcnow() if job["status"] == ExportStatus.COMPLETED.value else None
        }

    # Try querying Supabase
    try:
        uuid.UUID(str(export_id))
        client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase
        res = client.table("exports").select("*").eq("id", export_id).execute()
        if res.data:
            row = res.data[0]
            return {
                "id": row["id"],
                "project_id": row["project_id"],
                "status": row["status"],
                "output_format": row.get("output_format", "mp4"),
                "resolution": row.get("resolution", "1080p"),
                "download_url": row.get("download_url"),
                "created_at": row.get("created_at") or datetime.utcnow(),
                "completed_at": row.get("completed_at")
            }
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Export job not found")


@router.get("/exports/{export_id}/status", response_model=ExportProgress)
async def get_export_status(export_id: str, current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Get export job progress"""

    job = EXPORT_JOBS.get(export_id)
    if job:
        return ExportProgress(
            export_id=export_id,
            status=job["status"],
            progress=float(job.get("progress", 0.0)),
            message=job.get("message", "Processing..."),
            download_url=job.get("download_url")
        )

    # Try querying Supabase
    try:
        uuid.UUID(str(export_id))
        client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase
        res = client.table("exports").select("*").eq("id", export_id).execute()
        if res.data:
            row = res.data[0]
            st = row["status"]
            prog = 100.0 if st == "completed" else (50.0 if st == "processing" else 0.0)
            return ExportProgress(
                export_id=export_id,
                status=st,
                progress=prog,
                message="Export completed" if st == "completed" else ("Processing..." if st == "processing" else st),
                download_url=row.get("download_url")
            )
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Export job not found")


@router.get("/exports/{export_id}/download")
async def download_export(export_id: str):
    """Download exported MP4 video file"""

    job = EXPORT_JOBS.get(export_id)
    out_path = job.get("output_path") if job else None

    # Check render directory if out_path not in job dict
    if not out_path or not os.path.exists(out_path):
        render_dir = os.path.abspath(settings.REMOTION_RENDER_DIR)
        fallback_path = os.path.join(render_dir, f"{export_id}.mp4")
        if os.path.exists(fallback_path):
            out_path = fallback_path

    if not out_path or not os.path.exists(out_path):
        raise HTTPException(status_code=404, detail="Exported video file not found or not ready yet")

    return FileResponse(
        out_path,
        media_type="video/mp4",
        filename=f"captioned_video_{export_id}.mp4"
    )


@router.delete("/projects/{project_id}/cleanup")
async def cleanup_project(project_id: str):
    """Delete all temporary source and render files for project"""
    cleaned = cleanup_service.cleanup_project_files(project_id)
    if project_id in PROJECT_CAPTIONS:
        del PROJECT_CAPTIONS[project_id]
    return {"message": "Project cleanup completed", "files_cleaned": len(cleaned)}
