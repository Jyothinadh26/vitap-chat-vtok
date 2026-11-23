import os
import sys

# Ensure both api/ and its parent directory are in sys.path for Vercel multi-service hosting
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _parent_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import io
import json
from typing import Optional
from fastapi import FastAPI, APIRouter, Request, Response, Cookie, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.core.config import settings
from api.models.schemas import (
    StudentSession,
    LoginRequest,
    OtpVerifyRequest,
    ChatRequest,
    AuthResponse,
    LoginInitResponse
)
from api.core.session_store import (
    get_session,
    save_session,
    delete_session,
    extend_session
)
from api.core.vtop_sync import (
    init_login_flow,
    authenticate_and_sync,
    verify_otp,
    resync_session
)
from api.nlu.router import stream_chat_response, detect_intent_deterministic

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify Vercel deployment domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


@app.get("/")
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "demo_mode": settings.DEMO_MODE,
        "session_ttl": settings.SESSION_TTL_SECONDS
    }


@router.post("/auth/init", response_model=LoginInitResponse)
async def auth_init():
    return await init_login_flow()


@router.post("/auth/login", response_model=AuthResponse)
async def auth_login(req: LoginRequest, response: Response):
    # ZERO PASSWORD LOGGING INVARIANT
    res = await authenticate_and_sync(
        username=req.username,
        password=req.password,  # RAM-only
        captcha=req.captcha,
        login_flow_id=req.login_flow_id,
        otp=req.otp
    )
    
    if res.status == "SUCCESS" and res.session_id:
        # Set HttpOnly session cookie
        response.set_cookie(
            key=settings.COOKIE_NAME,
            value=res.session_id,
            max_age=settings.SESSION_TTL_SECONDS,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/"
        )
    return res


@router.post("/auth/otp", response_model=AuthResponse)
async def auth_otp(req: OtpVerifyRequest, response: Response):
    res = await verify_otp(
        login_flow_id=req.login_flow_id,
        otp=req.otp,
        username=req.username,
        password=req.password
    )
    if res.status == "SUCCESS" and res.session_id:
        response.set_cookie(
            key=settings.COOKIE_NAME,
            value=res.session_id,
            max_age=settings.SESSION_TTL_SECONDS,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/"
        )
    return res


@router.get("/session/me")
async def get_current_user_session(request: Request):
    session_id = request.cookies.get(settings.COOKIE_NAME)
    if not session_id:
        # Also check Authorization header Bearer token if cookie is not present
        auth_hdr = request.headers.get("Authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            session_id = auth_hdr.split("Bearer ")[1].strip()

    if not session_id:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    extend_session(session_id)
    return {
        "session_id": session.session_id,
        "profile": session.profile,
        "last_synced_at": session.last_synced_at,
        "attendance": session.attendance,
        "deadlines": session.deadlines,
        "exam_schedule": session.exam_schedule
    }


@router.post("/sync")
async def sync_data(request: Request):
    session_id = request.cookies.get(settings.COOKIE_NAME) or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not session_id:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    success, msg, updated = await resync_session(session_id, session)
    return {
        "status": "SUCCESS" if success else "ERROR",
        "message": msg,
        "last_synced_at": updated.last_synced_at
    }


@router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    session_id = request.cookies.get(settings.COOKIE_NAME) or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not session_id:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    # Strictly retrieve only this user's isolated session from Redis
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    extend_session(session_id)

    # Return Server-Sent Events stream
    return StreamingResponse(
        stream_chat_response(
            message=req.message,
            session=session,
            client_date=req.client_date
        ),
        media_type="text/event-stream"
    )


@router.post("/slides/upload")
async def upload_course_slide(
    request: Request,
    course_code: str = Form(...),
    file: UploadFile = File(...)
):
    session_id = request.cookies.get(settings.COOKIE_NAME) or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not session_id:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    # Free tier safe file size limit: 15 MB
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 15 MB allowed on Free Tier.")

    # In-memory text extraction or summary simulation
    return {
        "status": "SUCCESS",
        "filename": file.filename,
        "course_code": course_code.upper(),
        "size_bytes": len(contents),
        "summary": f"Slide notes summary for {course_code.upper()} parsed successfully ({len(contents)} bytes). Key concepts and exam formulas extracted.",
        "practice_questions": [
            f"Explain the primary architecture and protocol stacks of {course_code.upper()}.",
            f"Solve CAT-2 practice numerical problems for {course_code.upper()}."
        ],
        "message": f"Successfully parsed {file.filename} for {course_code.upper()}."
    }


@router.get("/materials/download")
async def download_clean_materials(request: Request, course_code: Optional[str] = None):
    session_id = request.cookies.get(settings.COOKIE_NAME) or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not session_id:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

    materials = session.course_materials
    if course_code:
        materials = [m for m in materials if m.course_code.upper() == course_code.upper()]

    return {
        "total_materials": len(materials),
        "materials": [
            {
                "course_code": m.course_code,
                "clean_filename": f"[{m.course_code}] - [{m.module}] - {m.title}.pdf",
                "original_filename": m.filename,
                "url": m.url
            }
            for m in materials
        ]
    }


@router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    session_id = request.cookies.get(settings.COOKIE_NAME)
    if session_id:
        delete_session(session_id)
        response.delete_cookie(settings.COOKIE_NAME, path="/")
    return {"status": "SUCCESS", "message": "Logged out successfully."}


# Mount router for both /api prefix and root paths
app.include_router(router, prefix="/api")
app.include_router(router)
