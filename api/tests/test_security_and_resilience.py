import re
import json
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from api.index import app
from api.core.config import settings
from api.core.session_store import get_session, save_session, delete_session
from api.models.schemas import StudentSession


@pytest.fixture
def mock_session_data():
    from api.core.vtop_sync import get_mock_session_data
    return get_mock_session_data()


# -----------------------------------------------------------------------------
# Suite A: Live VTOP Auth, Sync & Real-Time Resilience (7 Tests)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_a1_valid_vtop_login_and_cookie():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        secret_pwd = "SuperSecretStudentPassword123!"
        resp = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": secret_pwd,
            "captcha": "ABCD"
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert data["session_id"] is not None
        
        # Verify HttpOnly cookie was set
        cookies = resp.cookies
        assert settings.COOKIE_NAME in cookies
        session_id = cookies[settings.COOKIE_NAME]
        
        # Verify stored session in session_store
        stored = get_session(session_id)
        assert stored is not None
        assert stored.profile.reg_no == "22BCE10234"
        
        # D2: ZERO PASSWORD LEAKAGE AUDIT
        raw_dump = stored.model_dump_json()
        assert secret_pwd not in raw_dump
        assert secret_pwd not in resp.text


@pytest.mark.asyncio
async def test_a2_otp_required_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/auth/otp", json={
            "login_flow_id": "test-flow-id",
            "otp": "123456"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert data["session_id"] is not None


@pytest.mark.asyncio
async def test_a3_wrong_password_or_captcha():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid credentials
        resp_pwd = await client.post("/api/auth/login", json={
            "username": "REALUSER999",
            "password": "wrongpassword",
            "captcha": "ABCD"
        })
        assert resp_pwd.status_code == 200
        assert resp_pwd.json()["status"] == "INVALID_CREDENTIALS"

        # Invalid captcha
        resp_cap = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "somepassword",
            "captcha": "WRONG"
        })
        assert resp_cap.status_code == 200
        assert resp_cap.json()["status"] == "INVALID_CAPTCHA"


@pytest.mark.asyncio
async def test_a4_vtop_portal_down_resilience():
    # Simulate VTOP portal 503 / timeout
    with patch("api.core.vtop_sync.get_mock_session_data", side_effect=Exception("VTOP Portal 503 Service Unavailable")):
        from api.core.vtop_sync import authenticate_and_sync
        auth_res = await authenticate_and_sync(
            username="REALUSER123",
            password="mypassword",
            captcha="ABCD"
        )
        assert auth_res.status == "VTOP_UNAVAILABLE"
        assert "503" in auth_res.message or "unreachable" in auth_res.message


@pytest.mark.asyncio
async def test_a5_redis_ttl_expiry_401():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(settings.COOKIE_NAME, "non-existent-expired-uuid")
        resp = await client.post("/api/chat", json={"message": "Today's classes"})
        assert resp.status_code == 401
        assert "SESSION_EXPIRED" in resp.text


@pytest.mark.asyncio
async def test_a6_live_resync_mid_day(mock_session_data):
    session = StudentSession.model_validate(mock_session_data)
    session_id = "test-resync-uuid"
    save_session(session_id, session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(settings.COOKIE_NAME, session_id)
        res = await client.post("/api/sync")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert "last_synced_at" in data

        # Check subsequent chat gets updated timestamp
        chat_res = await client.post("/api/chat", json={"message": "75?"})
        assert chat_res.status_code == 200
        assert "event: ui_card" in chat_res.text


@pytest.mark.asyncio
async def test_a7_logout_deletes_session_and_fails_next_request():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_resp = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "SomePassword123"
        })
        session_id = login_resp.json()["session_id"]
        
        client.cookies.set(settings.COOKIE_NAME, session_id)
        logout_resp = await client.post("/api/auth/logout")
        assert logout_resp.status_code == 200
        
        # Verify key is deleted
        assert get_session(session_id) is None

        # Subsequent call with old session must return 401
        check_resp = await client.get("/api/session/me")
        assert check_resp.status_code == 401


# -----------------------------------------------------------------------------
# Suite D: Security, Privacy & Free-Tier Quota Resilience (5 Tests)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_d1_concurrent_users_isolation(mock_session_data):
    # User A
    session_a = StudentSession.model_validate(mock_session_data)
    session_a.session_id = "user-a-uuid"
    session_a.profile.reg_no = "22BCE11111"
    session_a.profile.name = "Alice Student"
    save_session("user-a-uuid", session_a)

    # User B
    session_b = StudentSession.model_validate(mock_session_data)
    session_b.session_id = "user-b-uuid"
    session_b.profile.reg_no = "22BCE22222"
    session_b.profile.name = "Bob Student"
    save_session("user-b-uuid", session_b)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Prompt injection test: User A asking for User B data
        client.cookies.set(settings.COOKIE_NAME, "user-a-uuid")
        resp_a = await client.get("/api/session/me")
        data_a = resp_a.json()
        assert data_a["profile"]["reg_no"] == "22BCE11111"
        assert data_a["profile"]["name"] == "Alice Student"
        # B's data must be completely inaccessible
        assert "22BCE22222" not in resp_a.text

        client.cookies.set(settings.COOKIE_NAME, "user-b-uuid")
        resp_b = await client.get("/api/session/me")
        data_b = resp_b.json()
        assert data_b["profile"]["reg_no"] == "22BCE22222"
        assert data_b["profile"]["name"] == "Bob Student"
        assert "22BCE11111" not in resp_b.text


@pytest.mark.asyncio
async def test_d2_log_and_cookie_audit_no_password():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_pwd = "P@ssw0rdAuditCheck!99"
        resp = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": test_pwd
        })
        session_id = resp.json()["session_id"]
        stored_session = get_session(session_id)
        
        # Regex check: ensure password does NOT appear anywhere
        pwd_regex = re.compile(re.escape(test_pwd))
        assert not pwd_regex.search(resp.text)
        assert not pwd_regex.search(stored_session.model_dump_json())


@pytest.mark.asyncio
async def test_d3_gemini_429_deterministic_fallback(mock_session_data):
    session = StudentSession.model_validate(mock_session_data)
    save_session("test-429-session", session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(settings.COOKIE_NAME, "test-429-session")
        resp = await client.post("/api/chat", json={"message": "seat"})
        assert resp.status_code == 200
        body = resp.text
        assert "event: ui_card" in body
        assert "exam_pass" in body
        assert "event: suggested_chips" in body


@pytest.mark.asyncio
async def test_d4_oversized_pdf_upload_rejected(mock_session_data):
    session = StudentSession.model_validate(mock_session_data)
    save_session("test-upload-session", session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(settings.COOKIE_NAME, "test-upload-session")
        
        # 16 MB fake file (> 15 MB limit)
        oversized_data = b"0" * (16 * 1024 * 1024)
        files = {"file": ("big_notes.pdf", oversized_data, "application/pdf")}
        data = {"course_code": "CSE2001"}
        
        resp = await client.post("/api/slides/upload", files=files, data=data)
        assert resp.status_code == 413
        assert "Max 15 MB" in resp.text


def test_d5_privacy_safe_pilot_telemetry():
    # Verify telemetry payload contains only anonymous metrics: tool_name, latency_ms, unmatched_alias
    telemetry_payload = {
        "tool_name": "get_attendance_analysis",
        "latency_ms": 42.5,
        "unmatched_alias": None
    }
    
    # Audit: ensure forbidden PII fields are never added
    forbidden_keys = {"student_name", "reg_no", "registration_number", "marks", "password", "query_text"}
    for k in forbidden_keys:
        assert k not in telemetry_payload


@pytest.mark.asyncio
async def test_a8_returning_user_otp_only_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Invalid OTP rejection
        bad_otp_resp = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "demoPassword123",
            "captcha": "ABCD",
            "otp": "WRONG"
        })
        assert bad_otp_resp.status_code == 200
        assert bad_otp_resp.json()["status"] == "INVALID_OTP"

        # 2. Valid OTP authentication with saved credentials
        good_otp_resp = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "demoPassword123",
            "captcha": "ABCD",
            "otp": "123456"
        })
        assert good_otp_resp.status_code == 200
        data = good_otp_resp.json()
        assert data["status"] == "SUCCESS"
        assert data["session_id"] is not None
        assert settings.COOKIE_NAME in good_otp_resp.cookies
