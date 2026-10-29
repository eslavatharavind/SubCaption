"""Advanced template IDs must behave exactly like Basic frontend template IDs at the backend.

The frontend renders all 188 templates itself and sends the full template config with exports.
The backend `apply-template` endpoint only knows its own legacy list, so it returns 404 for
frontend IDs; the editor already treats that as a non-fatal save failure. Advanced IDs must not
introduce any new behaviour (no 5xx, same status as a Basic ID).
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _apply(template_id: str):
    return client.post(
        "/api/projects/proj_compat_check/apply-template",
        json={"template_id": template_id},
    )


def test_advanced_and_basic_ids_get_identical_apply_template_responses():
    basic = _apply("caption-noir-editorial")
    advanced = _apply("adv-hook-slam")
    assert basic.status_code < 500
    assert advanced.status_code == basic.status_code


def test_export_schema_accepts_advanced_template_config():
    from app.schemas.export import ExportRequest

    advanced_config = {
        "id": "adv-travelling-highlight",
        "typography": {"fontFamily": "Inter", "fontWeight": 800, "fontSize": 46},
        "advanced": {"layout": "flow", "reveal": "all", "active": "box", "sample": "x", "differs": "x", "useCase": "x"},
    }
    fields = getattr(ExportRequest, "model_fields", None) or getattr(ExportRequest, "__fields__", {})
    assert "template_config" in fields
    # The nested `advanced` spec must pass through untouched to the renderer.
    req = ExportRequest(template_config=advanced_config)
    assert req.template_config["advanced"]["active"] == "box"
