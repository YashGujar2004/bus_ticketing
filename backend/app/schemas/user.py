"""
Pydantic schemas for User registration, login, and API responses.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas ───────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, examples=["john_doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="customer", pattern="^(admin|customer)$")


class UserLogin(BaseModel):
    username: str
    password: str


# ── Response Schemas ──────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
