"""
Authentication utilities:
  • Password hashing (bcrypt via passlib)
  • JWT creation and verification (PyJWT)
  • Password reset token generation
  • FastAPI dependency for protected routes
"""

# ─── MUST BE FIRST: load .env before reading env vars ───
import os
from dotenv import load_dotenv
load_dotenv()
# ────────────────────────────────────────────────────────

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import jwt
from jwt import PyJWTError as JWTError

from passlib.context import CryptContext


# ═════════════════════════════════════════════════════════
# CONFIG
# ═════════════════════════════════════════════════════════
SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "CHANGE_ME_IN_PRODUCTION_xyz_abc_123_use_a_long_random_string"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


# ═════════════════════════════════════════════════════════
# PASSWORD HASHING
# ═════════════════════════════════════════════════════════
def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return pwd_context.verify(plain[:72], hashed)
    except Exception:
        return False


# ═════════════════════════════════════════════════════════
# JWT
# ═════════════════════════════════════════════════════════
def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ═════════════════════════════════════════════════════════
# PASSWORD RESET TOKEN
# ═════════════════════════════════════════════════════════
def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


# ═════════════════════════════════════════════════════════
# FASTAPI DEPENDENCY
# ═════════════════════════════════════════════════════════
def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(creds.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
        email = payload["email"]
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Malformed token")

    return {"user_id": user_id, "email": email}