from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

# Модели для задач
class TaskBase(BaseModel):
    title: str
    description: str
    type: str  # "child" или "self"
    coins: int = 0
    start_date: datetime
    end_date: datetime
    is_repeating: bool = False
    child_name: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # "todo", "in-progress", "completed"
    coins: Optional[int] = None

class Task(TaskBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Модели для пользователей
class UserProfile(BaseModel):
    id: int
    telegram_id: int
    first_name: str
    login: str
    coins: int = 0
    created_at: datetime

class FamilyMember(BaseModel):
    id: int
    name: str
    age: Optional[int] = None
    coins: int = 0
    avatar_url: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    photo_url: Optional[str] = None