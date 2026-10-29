from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional, Dict, Any
import os
import re
import uuid
import json
from pathlib import Path
from ..schemas.caption import (
    CaptionSegment, CaptionSegmentList, CaptionSegmentUpdate,
    CaptionSplitRequest, CaptionMergeRequest
)
from ..schemas.project import Language
from ..services.elevenlabs.scribe import scribe_service
from ..services.video.ffmpeg import ffmpeg_service
from ..services.captions.segmentation import segmentation_service
from ..services.translation.translator import translation_service
from ..core.security import get_current_user_optional, get_user_client, supabase
from ..utils.logging import get_logger
from ..core.config import settings

router = APIRouter()
logger = get_logger(__name__)

# In-memory store for project captions & variants
PROJECT_CAPTIONS: Dict[str, List[Dict[str, Any]]] = {}
PROJECT_BASE_SEGMENTS: Dict[str, List[Dict[str, Any]]] = {}
PROJECT_CAPTION_VARIANTS: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
PROJECT_SPOKEN_LANG: Dict[str, str] = {}


def ensure_uuid(val: Optional[str] = None) -> str:
    """Ensure an ID is a valid UUID string compatible with Supabase UUID columns"""
    if val:
        try:
            uuid.UUID(str(val))
            return str(val)
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())


def sync_segments_to_supabase(project_id: str, segments: List[Dict[str, Any]], current_user: Optional[dict] = None):
    """Synchronize caption segments and words to Supabase database"""
    try:
        uuid.UUID(str(project_id))
    except (ValueError, AttributeError):
        return

    client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase

    try:
        # Delete existing segments for this project (CASCADE deletes caption_words)
        client.table("caption_segments").delete().eq("project_id", project_id).execute()

        seg_rows = []
        word_rows = []
        for s in segments:
            seg_id = ensure_uuid(s.get("id"))
            s["id"] = seg_id
            start_t = max(0.0, float(s.get("start") or s.get("start_time") or 0.0))
            end_t = max(start_t, float(s.get("end") or s.get("end_time") or start_t))
            seg_rows.append({
                "id": seg_id,
                "project_id": project_id,
                "text": s.get("text", ""),
                "start_time": start_t,
                "end_time": end_t,
                "style_data": s.get("style_data") or {},
                "position_data": s.get("position_data") or {"position": "bottom-center", "offsetY": 80},
                "animation_data": s.get("animation_data") or {"type": "pop"},
                "highlight_data": s.get("highlight_data") or {},
                "source_language": s.get("source_language"),
                "target_language": s.get("target_language"),
            })

            words = s.get("words") or []
            for w in words:
                w_id = ensure_uuid(w.get("id"))
                w["id"] = w_id
                w_start = max(0.0, float(w.get("start") or w.get("start_time") or 0.0))
                w_end = max(w_start, float(w.get("end") or w.get("end_time") or w_start))
                word_rows.append({
                    "id": w_id,
                    "segment_id": seg_id,
                    "word": w.get("text") or w.get("word") or "",
                    "start_time": w_start,
                    "end_time": w_end,
                    "highlighted": bool(w.get("highlighted", False)),
                    "highlight_color": w.get("highlight_color")
                })

        if seg_rows:
            client.table("caption_segments").insert(seg_rows).execute()
        if word_rows:
            client.table("caption_words").insert(word_rows).execute()

        logger.info("Successfully synced caption segments and words to Supabase", project_id=project_id, segments=len(seg_rows), words=len(word_rows))
    except Exception as e:
        logger.warning("Could not sync captions to Supabase", project_id=project_id, error=str(e))


def load_segments_from_supabase(project_id: str, current_user: Optional[dict] = None) -> Optional[List[Dict[str, Any]]]:
    """Retrieve caption segments and word timings from Supabase database"""
    try:
        uuid.UUID(str(project_id))
    except (ValueError, AttributeError):
        return None

    client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase

    try:
        seg_res = client.table("caption_segments").select("*").eq("project_id", project_id).order("start_time").execute()
        if not seg_res.data:
            return None

        segments = []
        seg_ids = [s["id"] for s in seg_res.data]
        word_res = client.table("caption_words").select("*").in_("segment_id", seg_ids).order("start_time").execute()

        words_by_seg: Dict[str, List[Dict[str, Any]]] = {}
        for w in (word_res.data or []):
            sid = w["segment_id"]
            if sid not in words_by_seg:
                words_by_seg[sid] = []
            words_by_seg[sid].append({
                "id": w["id"],
                "text": w["word"],
                "word": w["word"],
                "start": w["start_time"],
                "end": w["end_time"],
                "highlighted": w.get("highlighted", False),
                "highlight_color": w.get("highlight_color")
            })

        for s in seg_res.data:
            segments.append({
                "id": s["id"],
                "project_id": s["project_id"],
                "text": s["text"],
                "start": s["start_time"],
                "end": s["end_time"],
                "words": words_by_seg.get(s["id"], []),
                "style_data": s.get("style_data") or {},
                "position_data": s.get("position_data") or {"position": "bottom-center", "offsetY": 80},
                "animation_data": s.get("animation_data") or {"type": "pop"},
                "highlight_data": s.get("highlight_data") or {},
                "source_language": s.get("source_language"),
                "target_language": s.get("target_language"),
            })
        return segments
    except Exception as e:
        logger.warning("Could not load captions from Supabase", project_id=project_id, error=str(e))
        return None


def _get_project_captions_path(project_id: str) -> str:
    temp_dir = os.path.abspath(settings.TEMP_DIR)
    os.makedirs(temp_dir, exist_ok=True)
    return os.path.join(temp_dir, f"{project_id}_captions.json")

def _persist_captions(project_id: str, segments: List[Dict[str, Any]]):
    PROJECT_CAPTIONS[project_id] = segments
    try:
        path = _get_project_captions_path(project_id)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(segments, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist captions to disk: {e}")

def _load_persisted_captions(project_id: str) -> List[Dict[str, Any]]:
    if project_id in PROJECT_CAPTIONS and PROJECT_CAPTIONS[project_id]:
        return PROJECT_CAPTIONS[project_id]
    path = _get_project_captions_path(project_id)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    PROJECT_CAPTIONS[project_id] = data
                    return data
        except Exception as e:
            logger.warning(f"Could not read persisted captions from disk: {e}")
    return PROJECT_CAPTIONS.get(project_id, [])


@router.post("/projects/{project_id}/transcribe")
async def transcribe_video(
    project_id: str,
    language: Language = Language.ENGLISH,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Transcribe video using FFmpeg audio extraction & ElevenLabs Scribe,
    detect spoken language, segment transcript, and translate to requested target caption language if needed.
    """

    logger.info("Starting transcription flow", project_id=project_id, target_caption_language=language.value)

    # Check for temporary video file
    temp_dir = os.path.abspath(settings.TEMP_DIR)
    video_files = [
        f for f in os.listdir(temp_dir)
        if f.startswith(project_id) and any(f.lower().endswith(ext.lower()) for ext in settings.ALLOWED_VIDEO_FORMATS)
    ]
    if not video_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file not found in temporary storage. Please upload a video first."
        )

    video_path = os.path.join(temp_dir, video_files[0])

    # Get actual video duration
    meta_result = await ffmpeg_service.get_video_metadata(video_path)
    video_duration = meta_result.get('duration', 0.0) if meta_result.get('success') else 0.0

    # 1. Extract audio via FFmpeg
    audio_result = await ffmpeg_service.extract_audio(video_path)
    if not audio_result.get('success') or not audio_result.get('audio_path'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"FFmpeg audio extraction failed: {audio_result.get('error', 'Unknown audio extraction error')}"
        )

    audio_path = audio_result['audio_path']

    # 2. Transcribe via ElevenLabs Scribe API (auto-detect spoken audio language)
    try:
        transcription = await scribe_service.transcribe_audio(audio_path, language=None)
    finally:
        # Cleanup temporary audio file
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass

    if not transcription.get('success'):
        error_msg = transcription.get('error') or "Transcription failed. Please check your ElevenLabs API configuration."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    raw_spoken_text = transcription.get('text', '')
    detected_language_code = transcription.get('language_code') or transcription.get('language')
    spoken_language = translation_service.normalize_language_code(detected_language_code, raw_spoken_text)
    target_caption_language = translation_service.normalize_language_code(language.value)

    logger.info("Language analysis", project_id=project_id, spoken_language=spoken_language, target_caption_language=target_caption_language)

    # 3. Segment transcript into caption blocks with word-level timing based on spoken language
    words = transcription.get('words', [])
    raw_segments = segmentation_service.segment_transcript(words, spoken_language)

    # 4. Perform translation if target caption language differs from spoken language
    # or if Telugu mode is selected and contains English loan words requiring phonetic transliteration into Telugu script
    needs_processing = (
        spoken_language != target_caption_language or
        (target_caption_language == "te" and any(re.search(r'[A-Za-z]', s.get('text', '')) for s in raw_segments))
    )
    if needs_processing:
        processed_segments = await translation_service.translate_segments(raw_segments, spoken_language, target_caption_language)
    else:
        processed_segments = raw_segments

    # Convert to structured caption segments with default transparent styling, clamped to video_duration
    formatted_segments = []
    base_segments = []
    for idx, seg in enumerate(processed_segments):
        seg_id = ensure_uuid(seg.get('id'))
        seg_start = float(seg.get('start', 0.0))
        seg_end = float(seg.get('end', 0.0))

        if video_duration > 0:
            seg_start = min(seg_start, video_duration)
            seg_end = min(seg_end, video_duration)

        seg_words = []
        for w in seg.get('words', []):
            w_start = float(w.get('start', 0.0))
            w_end = float(w.get('end', 0.0))
            if video_duration > 0:
                w_start = min(w_start, video_duration)
                w_end = min(w_end, video_duration)
            seg_words.append({
                'id': ensure_uuid(w.get('id')),
                'text': w.get('text', ''),
                'start': round(w_start, 2),
                'end': round(w_end, 2)
            })

        seg_obj = {
            "id": seg_id,
            "project_id": project_id,
            "text": seg.get('text', ''),
            "start": round(seg_start, 2),
            "end": round(seg_end, 2),
            "words": seg_words,
            "style_data": {
                "font": "Inter",
                "fontSize": 48,
                "fontWeight": 700,
                "textColor": "#FFFFFF",
                "highlightColor": "#FFD600",
                "strokeWidth": 2,
                "strokeColor": "#000000",
                "background": "transparent",
                "shadow": True
            },
            "position_data": {
                "position": "bottom-center",
                "offsetY": 80
            },
            "animation_data": {
                "type": "pop"
            }
        }
        formatted_segments.append(seg_obj)

    # Convert raw_segments to base format for mode switching
    for idx, seg in enumerate(raw_segments):
        b_id = f"base_{project_id}_{idx}"
        b_words = [{'text': w.get('text', ''), 'start': round(float(w.get('start', 0)), 2), 'end': round(float(w.get('end', 0)), 2)} for w in seg.get('words', [])]
        base_segments.append({
            "id": b_id,
            "project_id": project_id,
            "text": seg.get('text', ''),
            "start": round(float(seg.get('start', 0)), 2),
            "end": round(float(seg.get('end', 0)), 2),
            "words": b_words,
            "style_data": {
                "font": "Inter",
                "fontSize": 48,
                "fontWeight": 700,
                "textColor": "#FFFFFF",
                "highlightColor": "#FFD600",
                "strokeWidth": 2,
                "strokeColor": "#000000",
                "background": "transparent",
                "shadow": True
            },
            "position_data": {"position": "bottom-center", "offsetY": 80},
            "animation_data": {"type": "pop"}
        })

    # Save segments in project caption store and variant cache
    PROJECT_CAPTIONS[project_id] = formatted_segments
    PROJECT_BASE_SEGMENTS[project_id] = base_segments
    PROJECT_SPOKEN_LANG[project_id] = spoken_language
    if project_id not in PROJECT_CAPTION_VARIANTS:
        PROJECT_CAPTION_VARIANTS[project_id] = {}
    PROJECT_CAPTION_VARIANTS[project_id][target_caption_language] = formatted_segments

    # Persist locally and sync to Supabase database
    _persist_captions(project_id, formatted_segments)
    sync_segments_to_supabase(project_id, formatted_segments, current_user)

    # Update project status in Supabase
    try:
        client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase
        client.table("projects").update({
            "status": "ready",
            "duration": video_duration if video_duration > 0 else None
        }).eq("id", project_id).execute()
    except Exception as st_err:
        logger.warning("Could not update project status in Supabase", project_id=project_id, error=str(st_err))

    logger.info("Transcription completed", project_id=project_id, spoken_language=spoken_language, target_caption_language=target_caption_language, segment_count=len(formatted_segments), video_duration=video_duration)

    return {
        "message": "Transcription completed successfully",
        "project_id": project_id,
        "text": transcription.get('text', ''),
        "segments": formatted_segments,
        "spoken_language": spoken_language,
        "caption_language": target_caption_language,
        "language": target_caption_language,
        "video_duration": video_duration
    }


@router.post("/projects/{project_id}/captions/mode")
async def change_caption_mode(project_id: str, payload: Dict[str, Any]):
    """
    Switch caption output mode (te, te_en, en, hi, te_roman) without re-transcribing audio.
    Uses variant caching for sub-second mode switching.
    """
    target_mode = payload.get("mode") or payload.get("language") or "en"
    target_mode = translation_service.normalize_language_code(target_mode)

    logger.info("Changing caption mode", project_id=project_id, target_mode=target_mode)

    # Check variant cache first
    if project_id in PROJECT_CAPTION_VARIANTS and target_mode in PROJECT_CAPTION_VARIANTS[project_id]:
        cached_segs = PROJECT_CAPTION_VARIANTS[project_id][target_mode]
        PROJECT_CAPTIONS[project_id] = cached_segs
        logger.info("Serving caption mode from cache", project_id=project_id, mode=target_mode)
        return {
            "message": "Caption mode changed (from cache)",
            "mode": target_mode,
            "segments": cached_segs
        }

    # Retrieve base segments or current segments
    base_segs = PROJECT_BASE_SEGMENTS.get(project_id) or PROJECT_CAPTIONS.get(project_id, [])
    spoken_lang = PROJECT_SPOKEN_LANG.get(project_id, "te")

    if not base_segs:
        return {
            "message": "No captions available for project",
            "mode": target_mode,
            "segments": []
        }

    try:
        transformed_segs = await translation_service.translate_segments(base_segs, spoken_lang, target_mode)
    except Exception as e:
        logger.error("Caption mode transformation failed", project_id=project_id, error=str(e))
        # Graceful fallback: return original captions without crashing
        return {
            "message": "Unable to generate this caption mode. Your original transcription is still available.",
            "mode": target_mode,
            "segments": PROJECT_CAPTIONS.get(project_id, base_segs)
        }

    # Format output structure cleanly
    formatted_transformed = []
    for idx, seg in enumerate(transformed_segs):
        formatted_transformed.append({
            "id": f"seg_{project_id}_{target_mode}_{idx}",
            "project_id": project_id,
            "text": seg.get('text', ''),
            "start": seg.get('start', 0.0),
            "end": seg.get('end', 0.0),
            "words": seg.get('words', []),
            "style_data": base_segs[0].get("style_data", {}) if base_segs else {"font": "Inter", "fontSize": 48, "fontWeight": 700, "textColor": "#FFFFFF", "highlightColor": "#FFD600", "strokeWidth": 2, "strokeColor": "#000000", "background": "transparent", "shadow": True},
            "position_data": base_segs[0].get("position_data", {"position": "bottom-center", "offsetY": 80}) if base_segs else {"position": "bottom-center", "offsetY": 80},
            "animation_data": base_segs[0].get("animation_data", {"type": "pop"}) if base_segs else {"type": "pop"}
        })

    # Cache transformed variant
    if project_id not in PROJECT_CAPTION_VARIANTS:
        PROJECT_CAPTION_VARIANTS[project_id] = {}
    PROJECT_CAPTION_VARIANTS[project_id][target_mode] = formatted_transformed
    PROJECT_CAPTIONS[project_id] = formatted_transformed

    logger.info("Caption mode transformed and cached successfully", project_id=project_id, mode=target_mode)
    return {
        "message": "Caption mode updated successfully",
        "mode": target_mode,
        "segments": formatted_transformed
    }


@router.get("/projects/{project_id}/captions")
async def get_captions(project_id: str, current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Get all caption segments for a project with Supabase and disk persistence"""
    logger.info("Getting captions", project_id=project_id)

    # 1. Try loading from Supabase database
    db_segments = load_segments_from_supabase(project_id, current_user)
    if db_segments is not None and len(db_segments) > 0:
        PROJECT_CAPTIONS[project_id] = db_segments
        return {
            "segments": db_segments,
            "total": len(db_segments)
        }

    # 2. Fallback to persisted disk/memory store
    segments = _load_persisted_captions(project_id)

    return {
        "segments": segments,
        "total": len(segments)
    }


@router.put("/projects/{project_id}/captions")
async def update_all_captions(
    project_id: str,
    segments: List[Dict[str, Any]],
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Batch update all caption segments for a project with disk and Supabase persistence"""
    _persist_captions(project_id, segments)
    sync_segments_to_supabase(project_id, segments, current_user)
    return {"message": "Captions updated successfully", "total": len(segments)}


@router.delete("/projects/{project_id}/captions/{caption_id}")
async def delete_caption_segment(
    project_id: str,
    caption_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Delete an individual caption segment from a project"""
    logger.info("Deleting caption segment", project_id=project_id, caption_id=caption_id)
    segments = _load_persisted_captions(project_id)
    new_segments = [s for s in segments if s.get("id") != caption_id]
    _persist_captions(project_id, new_segments)

    try:
        uuid.UUID(str(caption_id))
        client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase
        client.table("caption_segments").delete().eq("id", caption_id).execute()
    except Exception as e:
        logger.warning("Could not delete caption segment from Supabase", caption_id=caption_id, error=str(e))

    return {
        "message": "Caption segment deleted successfully",
        "segments": new_segments,
        "total": len(new_segments)
    }


@router.patch("/captions/{caption_id}")
async def update_caption(
    caption_id: str,
    caption_data: CaptionSegmentUpdate,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Update a specific caption segment"""

    logger.info("Updating caption", caption_id=caption_id)

    # Attempt database update if valid UUID
    try:
        uuid.UUID(str(caption_id))
        client = get_user_client(current_user["token"]) if current_user and "token" in current_user else supabase
        db_updates: Dict[str, Any] = {}
        if caption_data.text is not None:
            db_updates["text"] = caption_data.text
        if caption_data.start is not None:
            db_updates["start_time"] = caption_data.start
        if caption_data.end is not None:
            db_updates["end_time"] = caption_data.end
        if caption_data.style_data is not None:
            db_updates["style_data"] = caption_data.style_data
        if caption_data.position_data is not None:
            db_updates["position_data"] = caption_data.position_data
        if caption_data.animation_data is not None:
            db_updates["animation_data"] = caption_data.animation_data
        if db_updates:
            client.table("caption_segments").update(db_updates).eq("id", caption_id).execute()
    except Exception as db_err:
        logger.warning("Could not patch caption in Supabase", caption_id=caption_id, error=str(db_err))

    # Search across all project captions
    for project_id, segments in PROJECT_CAPTIONS.items():
        for seg in segments:
            if seg["id"] == caption_id:
                if caption_data.text is not None:
                    seg["text"] = caption_data.text
                if caption_data.start is not None:
                    seg["start"] = caption_data.start
                if caption_data.end is not None:
                    seg["end"] = caption_data.end
                if caption_data.style_data is not None:
                    seg["style_data"].update(caption_data.style_data)
                if caption_data.position_data is not None:
                    seg["position_data"].update(caption_data.position_data)
                if caption_data.animation_data is not None:
                    seg["animation_data"].update(caption_data.animation_data)
                return seg

    # Fallback response if not found in memory
    return {
        "id": caption_id,
        "text": caption_data.text or "Sample caption",
        "start": caption_data.start or 0.0,
        "end": caption_data.end or 2.0,
        "style_data": caption_data.style_data or {},
        "position_data": caption_data.position_data or {},
        "animation_data": caption_data.animation_data or {}
    }


@router.post("/projects/{project_id}/captions/split")
async def split_caption(project_id: str, split_data: CaptionSplitRequest):
    """Split a caption segment into two at word boundary or mid-point"""

    segments = PROJECT_CAPTIONS.get(project_id, [])
    target_idx = None
    for i, seg in enumerate(segments):
        if seg["id"] == split_data.segment_id:
            target_idx = i
            break

    if target_idx is not None:
        seg = segments[target_idx]
        words = seg.get("words", [])
        if len(words) > 1:
            mid = len(words) // 2
            words1 = words[:mid]
            words2 = words[mid:]

            seg1 = {
                **seg,
                "id": f"{seg['id']}_1",
                "text": " ".join([w["text"] for w in words1]),
                "start": words1[0]["start"],
                "end": words1[-1]["end"],
                "words": words1
            }

            seg2 = {
                **seg,
                "id": f"{seg['id']}_2",
                "text": " ".join([w["text"] for w in words2]),
                "start": words2[0]["start"],
                "end": words2[-1]["end"],
                "words": words2
            }

            segments.pop(target_idx)
            segments.insert(target_idx, seg1)
            segments.insert(target_idx + 1, seg2)

    return {"message": "Caption split successfully", "segments": PROJECT_CAPTIONS.get(project_id, [])}


@router.post("/projects/{project_id}/captions/merge")
async def merge_captions(project_id: str, merge_data: CaptionMergeRequest):
    """Merge multiple caption segments into one"""

    segments = PROJECT_CAPTIONS.get(project_id, [])
    target_ids = set(merge_data.segment_ids)

    to_merge = [s for s in segments if s["id"] in target_ids]
    if len(to_merge) > 1:
        merged_words = []
        for s in to_merge:
            merged_words.extend(s.get("words", []))

        merged_words.sort(key=lambda w: w.get("start", 0))

        first_seg = to_merge[0]
        new_seg = {
            **first_seg,
            "id": f"merged_{uuid.uuid4().hex[:6]}",
            "text": " ".join([w["text"] for w in merged_words]),
            "start": merged_words[0]["start"],
            "end": merged_words[-1]["end"],
            "words": merged_words
        }

        # Keep first, remove others
        first_idx = next(i for i, s in enumerate(segments) if s["id"] == first_seg["id"])
        PROJECT_CAPTIONS[project_id] = [s for s in segments if s["id"] not in target_ids]
        PROJECT_CAPTIONS[project_id].insert(first_idx, new_seg)

    return {"message": "Captions merged successfully", "segments": PROJECT_CAPTIONS.get(project_id, [])}
