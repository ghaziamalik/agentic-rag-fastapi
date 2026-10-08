"""
Railway entry point.
This file tells uvicorn to load the app from backend.main.
"""
from backend.main import app

__all__ = ["app"]
