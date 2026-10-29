from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from ..schemas.template import Template, TemplateList, ApplyTemplateRequest
from ..api.captions import PROJECT_CAPTIONS
from ..utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


# First 10 Core Configuration-Based Templates
FIRST_10_TEMPLATES = [
    {
        "id": "tmpl_clean_sans",
        "name": "Clean Sans",
        "category": "clean",
        "font": "Inter",
        "fontSize": 48,
        "fontWeight": 700,
        "textColor": "#FFFFFF",
        "highlightColor": "#FFD600",
        "strokeWidth": 0,
        "strokeColor": "#000000",
        "shadow": False,
        "position": "bottom-center",
        "animation": "fade",
        "background": "rgba(0, 0, 0, 0.5)",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_bold_impact",
        "name": "Bold Impact",
        "category": "bold",
        "font": "Oswald",
        "fontSize": 52,
        "fontWeight": 900,
        "textColor": "#FFFFFF",
        "highlightColor": "#FFD600",
        "strokeWidth": 4,
        "strokeColor": "#000000",
        "shadow": True,
        "position": "bottom-center",
        "animation": "pop",
        "background": "transparent",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_minimal_white",
        "name": "Minimal White",
        "category": "minimal",
        "font": "Roboto",
        "fontSize": 42,
        "fontWeight": 400,
        "textColor": "#F8FAFC",
        "highlightColor": "#38BDF8",
        "strokeWidth": 0,
        "strokeColor": "#000000",
        "shadow": False,
        "position": "bottom-center",
        "animation": "fade",
        "background": "transparent",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_yellow_highlight",
        "name": "Yellow Highlight",
        "category": "highlight",
        "font": "Poppins",
        "fontSize": 48,
        "fontWeight": 700,
        "textColor": "#FFFFFF",
        "highlightColor": "#FFD600",
        "strokeWidth": 2,
        "strokeColor": "#000000",
        "shadow": True,
        "position": "bottom-center",
        "animation": "pop",
        "background": "rgba(15, 23, 42, 0.75)",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_karaoke_classic",
        "name": "Karaoke Classic",
        "category": "karaoke",
        "font": "Inter",
        "fontSize": 50,
        "fontWeight": 800,
        "textColor": "#94A3B8",
        "highlightColor": "#38BDF8",
        "strokeWidth": 2,
        "strokeColor": "#0F172A",
        "shadow": True,
        "position": "bottom-center",
        "animation": "karaoke",
        "background": "rgba(0, 0, 0, 0.6)",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_neon_glow",
        "name": "Neon Glow",
        "category": "neon",
        "font": "Montserrat",
        "fontSize": 50,
        "fontWeight": 800,
        "textColor": "#00F0FF",
        "highlightColor": "#FF007A",
        "strokeWidth": 2,
        "strokeColor": "#000000",
        "shadow": True,
        "position": "center",
        "animation": "glow",
        "background": "transparent",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_cinematic_bars",
        "name": "Cinematic Bars",
        "category": "cinematic",
        "font": "Georgia",
        "fontSize": 46,
        "fontWeight": 400,
        "textColor": "#FFFFFF",
        "highlightColor": "#E2E8F0",
        "strokeWidth": 0,
        "strokeColor": "#000000",
        "shadow": True,
        "position": "bottom-center",
        "animation": "fade",
        "background": "#000000",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_tech_digital",
        "name": "Tech Digital",
        "category": "tech",
        "font": "Fira Code",
        "fontSize": 44,
        "fontWeight": 600,
        "textColor": "#22C55E",
        "highlightColor": "#A855F7",
        "strokeWidth": 1,
        "strokeColor": "#052E16",
        "shadow": True,
        "position": "bottom-center",
        "animation": "slide",
        "background": "rgba(2, 44, 34, 0.8)",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_news_ticker",
        "name": "News Ticker",
        "category": "news",
        "font": "Arial",
        "fontSize": 44,
        "fontWeight": 700,
        "textColor": "#FFFFFF",
        "highlightColor": "#FACC15",
        "strokeWidth": 0,
        "strokeColor": "#000000",
        "shadow": False,
        "position": "bottom-center",
        "animation": "slide",
        "background": "#DC2626",
        "supported_languages": ["en", "hi", "te"]
    },
    {
        "id": "tmpl_instagram_vibes",
        "name": "Instagram Vibes",
        "category": "social",
        "font": "Nunito",
        "fontSize": 48,
        "fontWeight": 800,
        "textColor": "#FFFFFF",
        "highlightColor": "#EC4899",
        "strokeWidth": 3,
        "strokeColor": "#831843",
        "shadow": True,
        "position": "center",
        "animation": "pop",
        "background": "transparent",
        "supported_languages": ["en", "hi", "te"]
    }
]


@router.get("/templates", response_model=TemplateList)
async def list_templates(category: str = None):
    """List the first 10 configuration-based templates"""

    logger.info("Listing initial 10 templates", category=category)

    templates = []
    for tmpl in FIRST_10_TEMPLATES:
        if category and category != tmpl["category"]:
            continue

        templates.append({
            "id": tmpl["id"],
            "name": tmpl["name"],
            "category": tmpl["category"],
            "configuration_json": tmpl,
            "preview_image": None,
            "supported_languages": tmpl["supported_languages"],
            "is_free": True,
            "created_at": "2024-01-01T00:00:00"
        })

    return {
        "templates": templates,
        "total": len(templates)
    }


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get template by ID"""

    for tmpl in FIRST_10_TEMPLATES:
        if tmpl["id"] == template_id:
            return {
                "id": tmpl["id"],
                "name": tmpl["name"],
                "category": tmpl["category"],
                "configuration_json": tmpl,
                "preview_image": None,
                "supported_languages": tmpl["supported_languages"],
                "is_free": True,
                "created_at": "2024-01-01T00:00:00"
            }

    raise HTTPException(status_code=404, detail="Template not found")


@router.post("/projects/{project_id}/apply-template")
async def apply_template(project_id: str, apply_data: ApplyTemplateRequest):
    """Apply template configuration to all captions in a project"""

    logger.info("Applying template to project", project_id=project_id, template_id=apply_data.template_id)

    target_template = None
    for tmpl in FIRST_10_TEMPLATES:
        if tmpl["id"] == apply_data.template_id:
            target_template = tmpl
            break

    if not target_template:
        raise HTTPException(status_code=404, detail=f"Template '{apply_data.template_id}' not found")

    segments = PROJECT_CAPTIONS.get(project_id, [])
    for seg in segments:
        seg["style_data"] = {
            "font": target_template["font"],
            "fontSize": target_template["fontSize"],
            "fontWeight": target_template["fontWeight"],
            "textColor": target_template["textColor"],
            "highlightColor": target_template["highlightColor"],
            "strokeWidth": target_template["strokeWidth"],
            "strokeColor": target_template["strokeColor"],
            "background": target_template["background"],
            "shadow": target_template["shadow"]
        }
        seg["position_data"] = {
            "position": target_template["position"],
            "offsetY": 80
        }
        seg["animation_data"] = {
            "type": target_template["animation"]
        }

    return {
        "message": "Template applied successfully",
        "template_id": apply_data.template_id,
        "updated_segments": len(segments)
    }
