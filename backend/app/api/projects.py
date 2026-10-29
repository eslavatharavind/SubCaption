import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from ..schemas.project import ProjectCreate, Project, ProjectList
from ..core.security import get_current_user, get_user_client
from ..services.cleanup.temporary_files import cleanup_service
from ..utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/projects", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    """Create a new project for authenticated user in Supabase"""
    logger.info("Creating project", name=project_data.name, language=project_data.language, user_id=current_user["id"])

    project_id = str(uuid.uuid4())
    lang_val = project_data.language.value if hasattr(project_data.language, "value") else str(project_data.language)

    try:
        client = get_user_client(current_user["token"])
        res = client.table("projects").insert({
            "id": project_id,
            "user_id": current_user["id"],
            "name": project_data.name,
            "language": lang_val,
            "status": "uploaded"
        }).execute()

        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create project in database"
            )

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Project creation failed", error=str(e), user_id=current_user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating project: {str(e)}"
        )


@router.get("/projects", response_model=ProjectList)
async def list_projects(current_user: dict = Depends(get_current_user)):
    """List all projects for current authenticated user from Supabase"""
    logger.info("Listing projects", user_id=current_user["id"])

    try:
        client = get_user_client(current_user["token"])
        res = client.table("projects").select("*").order("created_at", desc=True).execute()
        projects_data = res.data or []
        return {
            "projects": projects_data,
            "total": len(projects_data)
        }
    except Exception as e:
        logger.error("Listing projects failed", error=str(e), user_id=current_user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error listing projects: {str(e)}"
        )


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get project by ID for authenticated user from Supabase"""
    logger.info("Getting project", project_id=project_id, user_id=current_user["id"])

    try:
        client = get_user_client(current_user["token"])
        res = client.table("projects").select("*").eq("id", project_id).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Getting project failed", project_id=project_id, error=str(e), user_id=current_user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error getting project: {str(e)}"
        )


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Delete project and associated data (must be owned by current user)"""
    logger.info("Deleting project", project_id=project_id, user_id=current_user["id"])

    try:
        client = get_user_client(current_user["token"])
        check = client.table("projects").select("id").eq("id", project_id).execute()
        if not check.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        client.table("projects").delete().eq("id", project_id).execute()

        # Clean up any local files on disk
        try:
            cleanup_service.cleanup_project_files(project_id)
        except Exception as file_err:
            logger.warning("Could not clean up temporary project files", project_id=project_id, error=str(file_err))

        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Deleting project failed", project_id=project_id, error=str(e), user_id=current_user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting project: {str(e)}"
        )
