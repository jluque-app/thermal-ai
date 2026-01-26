import sys
import os

# Add the backend directory to sys.path so we can import from app_improved
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_dir)

from backend.app_improved import app

# Vercel expects a handler, but if using FastAPI/Starlette, 'app' is enough if WSGI/ASGI is handled.
# Vercel Python runtime supports WSGI/ASGI automatically if 'app' object is exposed.
