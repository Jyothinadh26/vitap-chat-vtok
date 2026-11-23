import json
import time
from typing import Optional, Dict, Any
try:
    from upstash_redis import Redis
except ImportError:
    Redis = None

from api.core.config import settings
from api.models.schemas import StudentSession

# In-memory storage for local dev / testing / fallback
_in_memory_sessions: Dict[str, dict] = {}
_in_memory_expirations: Dict[str, float] = {}

def get_redis_client() -> Optional[Any]:
    if Redis is None:
        return None
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        try:
            return Redis(
                url=settings.UPSTASH_REDIS_REST_URL,
                token=settings.UPSTASH_REDIS_REST_TOKEN
            )
        except Exception as e:
            print(f"[SessionStore] Failed to initialize Upstash Redis: {e}")
            return None
    return None

def save_session(session_id: str, session: StudentSession, ttl: int = settings.SESSION_TTL_SECONDS) -> bool:
    key = f"vtop:session:{session_id}"
    serialized = session.model_dump_json()
    
    redis_client = get_redis_client()
    if redis_client:
        try:
            redis_client.set(key, serialized, ex=ttl)
            return True
        except Exception as e:
            print(f"[SessionStore] Redis error in save_session: {e}")
            
    # Fallback to in-memory store
    _in_memory_sessions[key] = json.loads(serialized)
    _in_memory_expirations[key] = time.time() + ttl
    return True

def get_session(session_id: str) -> Optional[StudentSession]:
    key = f"vtop:session:{session_id}"
    
    redis_client = get_redis_client()
    if redis_client:
        try:
            val = redis_client.get(key)
            if val:
                if isinstance(val, (bytes, bytearray)):
                    val = val.decode("utf-8")
                if isinstance(val, str):
                    val = json.loads(val)
                return StudentSession.model_validate(val)
        except Exception as e:
            print(f"[SessionStore] Redis error in get_session: {e}")
            
    # Check in-memory store
    if key in _in_memory_sessions:
        exp = _in_memory_expirations.get(key, 0)
        if time.time() > exp:
            delete_session(session_id)
            return None
        return StudentSession.model_validate(_in_memory_sessions[key])
        
    return None

def delete_session(session_id: str) -> bool:
    key = f"vtop:session:{session_id}"
    redis_client = get_redis_client()
    if redis_client:
        try:
            redis_client.delete(key)
        except Exception as e:
            print(f"[SessionStore] Redis error in delete_session: {e}")
            
    _in_memory_sessions.pop(key, None)
    _in_memory_expirations.pop(key, None)
    return True

def extend_session(session_id: str, ttl: int = settings.SESSION_TTL_SECONDS) -> bool:
    key = f"vtop:session:{session_id}"
    redis_client = get_redis_client()
    if redis_client:
        try:
            redis_client.expire(key, ttl)
            return True
        except Exception as e:
            print(f"[SessionStore] Redis error in extend_session: {e}")
            
    if key in _in_memory_expirations:
        _in_memory_expirations[key] = time.time() + ttl
        return True
    return False
