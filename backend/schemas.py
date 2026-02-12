from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enums
class UserRole(str, Enum):
    PARENT = "parent"
    CHILD = "child"

class TaskType(str, Enum):
    PERSONAL = "personal"
    CHILD = "child"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Auth schemas
class LoginRequest(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4, max_length=100)
    device_info: Optional[str] = ""

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[dict] = None
    expires_at: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    id: int
    telegram_id: Optional[int] = None
    first_name: str
    login: str
    role: UserRole
    coins: int
    photo_url: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    photo_url: Optional[str] = None

class RegisterRequest(BaseModel):
    telegram_id: int
    first_name: str = Field(..., min_length=2, max_length=50)
    login: Optional[str] = None
    password: Optional[str] = None

# Child schemas
class ChildCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    age: Optional[int] = Field(None, ge=1, le=18)

class ChildCreateResponse(BaseModel):
    success: bool
    message: str
    child_name: str
    child_id: Optional[int] = None

class ChildResponse(BaseModel):
    id: int
    first_name: str
    child_name: str
    login: str
    coins: int
    age: Optional[int] = None
    relationship: str = "child"
    created_at: datetime

# Task schemas
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., max_length=500)
    type: TaskType = TaskType.PERSONAL
    coins: int = Field(0, ge=0)
    start_date: str
    end_date: str
    is_repeating: bool = False
    child_id: Optional[int] = None
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Дата должна быть в формате YYYY-MM-DD')

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    type: TaskType
    status: TaskStatus
    coins: int
    start_date: date
    end_date: date
    is_repeating: bool
    created_at: datetime
    updated_at: datetime
    user_id: int
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None

# Coin transaction schemas
class CoinTransactionResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int] = None
    amount: int
    type: str
    description: Optional[str] = None
    created_at: datetime

# Family schemas
class FamilyMemberResponse(BaseModel):
    id: int
    parent_id: int
    child_id: int
    child_name: str
    age: Optional[int] = None
    relationship: str
    created_at: datetime
    coins: int = 0

# Health check
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    service: str
    database: str
    stats: dict

# Cloudflare info
class CloudflareInfoResponse(BaseModel):
    is_cloudflare: bool
    public_url: Optional[str] = None
    local_url: str
    network_url: str
    status: str
    timestamp: datetime