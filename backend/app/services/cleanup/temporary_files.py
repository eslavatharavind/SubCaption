import os
import shutil
from typing import List
from pathlib import Path
from app.utils.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class CleanupService:
    """Service for cleaning up temporary files"""

    def __init__(self):
        self.temp_dir = settings.TEMP_DIR
        self.render_dir = settings.REMOTION_RENDER_DIR

    def cleanup_project_files(self, project_id: str):
        """
        Clean up all temporary files for a project

        Args:
            project_id: Project identifier
        """

        logger.info("Cleaning up project files", project_id=project_id)

        cleaned_files = []

        # Clean up temporary directory
        if os.path.exists(self.temp_dir):
            for file_name in os.listdir(self.temp_dir):
                if project_id in file_name:
                    file_path = os.path.join(self.temp_dir, file_name)
                    try:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            cleaned_files.append(file_path)
                            logger.debug("Removed file", path=file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                            cleaned_files.append(file_path)
                            logger.debug("Removed directory", path=file_path)
                    except Exception as e:
                        logger.error("Failed to remove file", path=file_path, error=str(e))

        # Clean up renders directory
        if os.path.exists(self.render_dir):
            for file_name in os.listdir(self.render_dir):
                if project_id in file_name:
                    file_path = os.path.join(self.render_dir, file_name)
                    try:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            cleaned_files.append(file_path)
                            logger.debug("Removed render file", path=file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                            cleaned_files.append(file_path)
                            logger.debug("Removed render directory", path=file_path)
                    except Exception as e:
                        logger.error("Failed to remove render file", path=file_path, error=str(e))

        logger.info("Cleanup completed", project_id=project_id, files_cleaned=len(cleaned_files))

        return cleaned_files

    def cleanup_old_files(self, max_age_hours: int = 24):
        """
        Clean up files older than specified age

        Args:
            max_age_hours: Maximum age in hours
        """

        logger.info("Running scheduled cleanup", max_age_hours=max_age_hours)

        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        cleaned_count = 0

        for directory in [self.temp_dir, self.render_dir]:
            if not os.path.exists(directory):
                continue

            for file_name in os.listdir(directory):
                file_path = os.path.join(directory, file_name)

                try:
                    file_age = current_time - os.path.getmtime(file_path)
                    if file_age > max_age_seconds:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            cleaned_count += 1
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                            cleaned_count += 1
                except Exception as e:
                    logger.error("Failed to clean old file", path=file_path, error=str(e))

        logger.info("Scheduled cleanup completed", files_cleaned=cleaned_count)

        return cleaned_count


# Import time for age calculation
import time

cleanup_service = CleanupService()
