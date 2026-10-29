import os
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import supabase
from app.core.config import settings

client = TestClient(app)


@pytest.fixture(scope="module")
def test_users():
    """Create two temporary test users in Supabase Auth and return their tokens and IDs"""
    u1_email = f"pytest_u1_{uuid.uuid4().hex[:8]}@example.com"
    u2_email = f"pytest_u2_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "PytestSecurePass123!"

    u1_res = supabase.auth.admin.create_user({"email": u1_email, "password": pwd, "email_confirm": True})
    u2_res = supabase.auth.admin.create_user({"email": u2_email, "password": pwd, "email_confirm": True})

    u1_id = u1_res.user.id
    u2_id = u2_res.user.id

    from supabase import create_client
    c = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    token1 = c.auth.sign_in_with_password({"email": u1_email, "password": pwd}).session.access_token

    c2 = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    token2 = c2.auth.sign_in_with_password({"email": u2_email, "password": pwd}).session.access_token

    yield {
        "u1_id": u1_id,
        "token1": token1,
        "u2_id": u2_id,
        "token2": token2
    }

    # Teardown
    try:
        supabase.auth.admin.delete_user(u1_id)
        supabase.auth.admin.delete_user(u2_id)
    except Exception:
        pass


def test_public_user_profile_created_by_trigger(test_users):
    """Verify that public.users profile exists for newly registered Auth user"""
    res = supabase.table("users").select("*").eq("id", test_users["u1_id"]).execute()
    assert len(res.data) == 1
    assert res.data[0]["id"] == test_users["u1_id"]


def test_project_crud_and_rls(test_users):
    """Verify project creation, listing, retrieval, RLS isolation, and deletion"""
    h1 = {"Authorization": f"Bearer {test_users['token1']}"}
    h2 = {"Authorization": f"Bearer {test_users['token2']}"}

    # 1. Create project
    create_res = client.post(
        "/api/projects",
        json={"name": "Pytest Video Project", "language": "en"},
        headers=h1
    )
    assert create_res.status_code == 201
    project = create_res.json()
    project_id = project["id"]
    assert project["user_id"] == test_users["u1_id"]

    # 2. User 1 can list their project
    list_res = client.get("/api/projects", headers=h1)
    assert list_res.status_code == 200
    p_ids = [p["id"] for p in list_res.json()["projects"]]
    assert project_id in p_ids

    # 3. User 2 CANNOT access User 1's project (RLS)
    get_u2 = client.get(f"/api/projects/{project_id}", headers=h2)
    assert get_u2.status_code == 404

    list_u2 = client.get("/api/projects", headers=h2)
    assert list_u2.status_code == 200
    assert project_id not in [p["id"] for p in list_u2.json()["projects"]]

    # 4. Save and load captions
    seg_id = str(uuid.uuid4())
    test_segs = [
        {
            "id": seg_id,
            "project_id": project_id,
            "text": "Hello world",
            "start": 0.0,
            "end": 2.0,
            "words": [{"text": "Hello", "start": 0.0, "end": 1.0}, {"text": "world", "start": 1.1, "end": 2.0}],
            "style_data": {"font": "Inter", "fontSize": 48},
            "position_data": {"position": "bottom-center"},
            "animation_data": {"type": "pop"}
        }
    ]
    save_cap_res = client.put(f"/api/projects/{project_id}/captions", json=test_segs, headers=h1)
    assert save_cap_res.status_code == 200

    load_cap_res = client.get(f"/api/projects/{project_id}/captions", headers=h1)
    assert load_cap_res.status_code == 200
    loaded = load_cap_res.json()["segments"]
    assert len(loaded) == 1
    assert loaded[0]["text"] == "Hello world"
    assert len(loaded[0]["words"]) == 2

    # 5. Delete project
    del_res = client.delete(f"/api/projects/{project_id}", headers=h1)
    assert del_res.status_code == 200

    # Verify project is gone from Supabase
    db_check = supabase.table("projects").select("*").eq("id", project_id).execute()
    assert len(db_check.data) == 0

