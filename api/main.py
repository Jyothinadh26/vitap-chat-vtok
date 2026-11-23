import os
import sys
import types

# Ensure both api/ and its parent directory are in sys.path for Vercel multi-service hosting
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _parent_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Crucial for Vercel Serverless: When root="api", the service runs from inside api/
# where "api" itself is not a package in sys.path. Alias "api" to _current_dir.
if "api" not in sys.modules:
    api_pkg = types.ModuleType("api")
    api_pkg.__path__ = [_current_dir]
    api_pkg.__file__ = os.path.join(_current_dir, "__init__.py")
    sys.modules["api"] = api_pkg

# Import the FastAPI application instance from index.py
from index import app

__all__ = ["app"]
