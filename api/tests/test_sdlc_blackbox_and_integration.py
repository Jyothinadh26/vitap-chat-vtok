import pytest
import re
from httpx import AsyncClient, ASGITransport
from api.index import app
from api.core.config import settings
from api.core.session_store import save_session, get_session
from api.models.schemas import StudentSession


# =============================================================================
# SDLC BLACK-BOX FUNCTIONAL & INTEGRATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_bb_integration_full_first_time_login_journey():
    """
    SDLC Integration Journey 1: First-time student logs in with credentials,
    completes authentication, receives session cookie, queries chat assistant,
    and validates SSE streaming protocol response.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Init flow
        init_res = await client.post("/api/auth/init")
        assert init_res.status_code == 200
        flow_data = init_res.json()
        assert "login_flow_id" in flow_data

        # Step 2: Login with credentials
        login_res = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "validStudentPassword123",
            "captcha": "ABCD",
            "login_flow_id": flow_data["login_flow_id"]
        })
        assert login_res.status_code == 200
        auth_data = login_res.json()
        assert auth_data["status"] == "SUCCESS"
        assert auth_data["session_id"] is not None
        assert settings.COOKIE_NAME in login_res.cookies

        # Step 3: Check /api/session/me
        me_res = await client.get("/api/session/me")
        assert me_res.status_code == 200
        session_info = me_res.json()
        assert session_info["profile"]["reg_no"] == "22BCE10234"
        assert len(session_info["attendance"]) > 0

        # Step 4: Chat assistant query with SSE stream validation
        chat_res = await client.post("/api/chat", json={"message": "Can I skip Computer Networks today?"})
        assert chat_res.status_code == 200
        assert "text/event-stream" in chat_res.headers.get("content-type", "")
        body = chat_res.text
        assert "event: chunk" in body or "event: ui_card" in body
        assert "event: done" in body


@pytest.mark.asyncio
async def test_bb_integration_returning_student_otp_only_journey():
    """
    SDLC Integration Journey 2: Returning student with saved profile credentials
    authenticates using only the 6-digit OTP code, verifying instant session resumption.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Submit login with saved credentials and OTP
        otp_login_res = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "savedVaultPassword",
            "captcha": "ABCD",
            "otp": "654321"
        })
        assert otp_login_res.status_code == 200
        data = otp_login_res.json()
        assert data["status"] == "SUCCESS"
        assert data["session_id"] is not None

        # Step 2: Verify active session profile has credentials_saved flag
        me_res = await client.get("/api/session/me")
        assert me_res.status_code == 200
        assert me_res.json()["profile"]["credentials_saved"] is True


@pytest.mark.asyncio
async def test_bb_blackbox_error_guessing_and_negative_inputs():
    """
    SDLC Black-Box Functional Test: Equivalence Partitioning & Error Guessing
    Verifies proper HTTP error codes and friendly error status for negative cases:
    - Missing required fields
    - Wrong credentials
    - Wrong CAPTCHA
    - Expired/Malformed OTP
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Missing username/password
        resp_missing = await client.post("/api/auth/login", json={})
        assert resp_missing.status_code == 422  # Unprocessable Entity

        # 2. Wrong CAPTCHA
        resp_captcha = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "validPassword",
            "captcha": "WRONG"
        })
        assert resp_captcha.status_code == 200
        assert resp_captcha.json()["status"] == "INVALID_CAPTCHA"

        # 3. Wrong Password
        resp_pwd = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "wrongpassword",
            "captcha": "ABCD"
        })
        assert resp_pwd.status_code == 200
        assert resp_pwd.json()["status"] == "INVALID_CREDENTIALS"

        # 4. Invalid OTP format
        resp_otp = await client.post("/api/auth/otp", json={
            "login_flow_id": "test-flow",
            "otp": "12"  # Too short (< 4)
        })
        assert resp_otp.status_code == 200
        assert resp_otp.json()["status"] == "ERROR"


@pytest.mark.asyncio
async def test_bb_integration_materials_and_slide_qa():
    """
    SDLC Integration Journey 3: Course materials upload and query pipeline.
    Validates file upload, PDF content parsing simulation, and question generation.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Set up an authenticated session
        login_res = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "validPassword",
            "captcha": "ABCD"
        })
        assert login_res.status_code == 200

        # Upload a valid course slide notes file (< 15 MB)
        fake_pdf = b"%PDF-1.4 Mock Slide Notes Content for Unit 1 Computer Networks"
        files = {"file": ("Unit1_Notes.pdf", fake_pdf, "application/pdf")}
        data = {"course_code": "CSE2001"}

        upload_res = await client.post("/api/slides/upload", files=files, data=data)
        assert upload_res.status_code == 200
        upload_data = upload_res.json()
        assert upload_data["status"] == "SUCCESS"
        assert "summary" in upload_data
        assert "practice_questions" in upload_data


@pytest.mark.asyncio
async def test_bb_integration_session_lifecycle_and_logout():
    """
    SDLC Integration Journey 4: Complete session lifecycle — login, session verification,
    data re-sync, explicit logout, and subsequent request rejection.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/auth/login", json={
            "username": "22BCE10234",
            "password": "validPassword",
            "captcha": "ABCD"
        })
        assert login_res.status_code == 200
        session_id = login_res.json()["session_id"]
        assert session_id is not None

        # 2. Re-Sync
        sync_res = await client.post("/api/sync")
        assert sync_res.status_code == 200
        assert sync_res.json()["status"] == "SUCCESS"

        # 3. Logout
        logout_res = await client.post("/api/auth/logout")
        assert logout_res.status_code == 200
        assert logout_res.json()["status"] == "SUCCESS"

        # 4. Verify subsequent request is rejected with 401
        after_logout = await client.get("/api/session/me")
        assert after_logout.status_code == 401
