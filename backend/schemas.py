from pydantic import BaseModel, EmailStr, Field
from typing import List


# ═════════════════════════════════════════════════════════
# AUTH
# ═════════════════════════════════════════════════════════
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    name: str = ""


class UserOut(BaseModel):
    user_id: int
    email: str
    name: str = ""


# ─── Password Reset ───
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str


# ═════════════════════════════════════════════════════════
# ASK / CHAT
# ═════════════════════════════════════════════════════════
class AskRequest(BaseModel):
    question: str
    session_id: int
    selected_doc: str = "All Documents"


class AskResponse(BaseModel):
    answer: str
    agent_steps: List[str] = []
    retrieved_doc_count: int = 0


class SessionCreateRequest(BaseModel):
    title: str = "New Chat"


class SessionCreateResponse(BaseModel):
    session_id: int
    title: str


class MessageOut(BaseModel):
    role: str
    content: str


class SessionOut(BaseModel):
    id: int
    title: str


class ProcessResponse(BaseModel):
    chunk_count: int
    doc_names: List[str]


class DeleteResponse(BaseModel):
    success: bool
    message: str