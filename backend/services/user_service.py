from typing import Optional, Dict, List
from datetime import datetime, timedelta
import secrets
import hashlib

from db import db, hash_password, generate_token
from schemas import UserRole, UserUpdate

class UserService:
    
    @staticmethod
    def authenticate(login: str, password: str, device_info: str = "") -> Optional[Dict]:
        """Аутентификация пользователя"""
        user = db.get_user_by_login(login)
        
        if not user:
            return None
        
        password_hash = hash_password(password)
        if user['password'] != password_hash:
            return None
        
        if not user.get('is_active', 1):
            return None
        
        # Очищаем старые сессии
        db.execute_query(
            "DELETE FROM sessions WHERE user_id = ?",
            (user['id'],)
        )
        
        # Создаем новую сессию
        token = generate_token()
        expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        
        session_id = db.create_session(
            user_id=user['id'],
            token=token,
            expires_at=expires_at,
            device_info=device_info
        )
        
        if not session_id:
            return None
        
        # Обновляем время последнего входа
        db.update_user(user['id'], last_login=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        return {
            "user": {
                "id": user['id'],
                "telegram_id": user['telegram_id'],
                "first_name": user['first_name'],
                "login": user['login'],
                "role": user['role'],
                "coins": user['coins'],
                "photo_url": user.get('photo_url')
            },
            "token": token,
            "expires_at": expires_at
        }
    
    @staticmethod
    def register_via_telegram(telegram_id: int, first_name: str) -> Optional[Dict]:
        """Регистрация пользователя через Telegram"""
        # Проверяем существующего пользователя
        existing = db.get_user_by_telegram_id(telegram_id)
        if existing:
            # Создаем сессию для существующего пользователя
            token = generate_token()
            expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
            
            db.create_session(
                user_id=existing['id'],
                token=token,
                expires_at=expires_at,
                device_info="telegram_auto_login"
            )
            
            return {
                "user_id": existing['id'],
                "login": existing['login'],
                "password": None,
                "token": token,
                "expires_at": expires_at,
                "is_new": False
            }
        
        # Генерируем логин и пароль
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        login = f"user_{timestamp}"
        
        import random, string
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        password_hash = hash_password(password)
        
        # Создаем пользователя
        user_id = db.create_user(
            telegram_id=telegram_id,
            first_name=first_name,
            login=login,
            password_hash=password_hash,
            role='parent'
        )
        
        if not user_id:
            return None
        
        # Создаем сессию
        token = generate_token()
        expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        
        db.create_session(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            device_info="telegram_registered"
        )
        
        return {
            "user_id": user_id,
            "login": login,
            "password": password,
            "token": token,
            "expires_at": expires_at,
            "is_new": True
        }
    
    @staticmethod
    def get_profile(user_id: int) -> Optional[Dict]:
        """Получение полного профиля пользователя"""
        user = db.get_user_with_stats(user_id)
        if not user:
            return None
        
        children = db.get_children_by_parent_id(user_id)
        tasks = db.get_user_tasks(user_id)
        
        return {
            "user": {
                "id": user['id'],
                "telegram_id": user['telegram_id'],
                "first_name": user['first_name'],
                "login": user['login'],
                "role": user['role'],
                "coins": user['coins'],
                "photo_url": user.get('photo_url'),
                "created_at": user['created_at'],
                "last_login": user.get('last_login')
            },
            "children": children,
            "tasks_count": len(tasks),
            "completed_tasks": len([t for t in tasks if t.get('status') == 'completed']),
            "total_coins": user['coins'],
            "family_coins": user.get('family_coins', user['coins']),
            "children_count": len(children)
        }

class ChildService:
    
    @staticmethod
    def create_child(parent_id: int, name: str, age: Optional[int] = None) -> Optional[Dict]:
        """Создание аккаунта ребенка"""
        if not name or len(name.strip()) < 2:
            return None
        
        if age is not None and (age < 1 or age > 18):
            return None
        
        # Генерируем логин и пароль
        timestamp = datetime.now().strftime('%H%M%S')
        parent = db.get_user_by_id(parent_id)
        if not parent:
            return None
        
        login = f"child_{parent['login']}_{timestamp}"
        password = secrets.token_urlsafe(8)[:10]
        password_hash = hash_password(password)
        
        # Создаем ребенка
        child_id = db.create_child_user(
            parent_id=parent_id,
            child_name=name,
            login=login,
            password_hash=password_hash,
            age=age
        )
        
        if not child_id:
            return None
        
        return {
            "child_id": child_id,
            "child_name": name,
            "login": login,
            "password": password,
            "age": age
        }
    
    @staticmethod
    def get_children(parent_id: int) -> List[Dict]:
        """Получение списка детей"""
        return db.get_children_by_parent_id(parent_id)
    
    @staticmethod
    def get_child_data(parent_id: int, child_id: int) -> Optional[Dict]:
        """Получение данных конкретного ребенка"""
        return db.get_child_by_id(child_id, parent_id)

class TaskService:
    
    @staticmethod
    def create_task(user_id: int, task_data: Dict) -> Optional[Dict]:
        """Создание задачи"""
        task_id = db.create_task(
            user_id=user_id,
            title=task_data['title'],
            description=task_data['description'],
            task_type=task_data['type'],
            coins=task_data['coins'],
            start_date=task_data['start_date'],
            end_date=task_data['end_date'],
            assigned_to_id=task_data.get('child_id'),
            is_repeating=task_data.get('is_repeating', False)
        )
        
        if not task_id:
            return None
        
        task = db.get_task_by_id(task_id, user_id)
        return task
    
    @staticmethod
    def complete_task(task_id: int, user_id: int) -> Optional[Dict]:
        """Завершение задачи и начисление монет"""
        task = db.get_task_by_id(task_id, user_id)
        if not task:
            return None
        
        # Обновляем статус
        success = db.update_task_status(task_id, user_id, 'completed')
        if not success:
            return None
        
        # Начисляем монеты
        if task['coins'] > 0:
            assigned_to_id = task['assigned_to_id'] or user_id
            
            db.add_coins(
                user_id=assigned_to_id,
                amount=task['coins'],
                task_id=task_id,
                description=f"Задача выполнена: {task['title']}"
            )
            
            # Создаем уведомление
            db.create_notification(
                user_id=assigned_to_id,
                title="🎉 Задача выполнена!",
                message=f"Вам начислено {task['coins']} монет за задачу: {task['title']}",
                notification_type="reward"
            )
            
            updated_user = db.get_user_by_id(assigned_to_id)
            task['updated_coins'] = updated_user['coins'] if updated_user else None
        
        return task
    
    @staticmethod
    def get_tasks_for_date(user_id: int, date: datetime) -> List[Dict]:
        """Получение задач на конкретную дату"""
        date_str = date.strftime('%Y-%m-%d')
        return db.get_tasks_for_date(user_id, date_str)