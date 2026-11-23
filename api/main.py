import os
import sys

# Ensure both api/ and its parent directory are in sys.path for Vercel multi-service hosting
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _parent_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Import the FastAPI application instance from index.py
from index import app

__all__ = ["app"]
