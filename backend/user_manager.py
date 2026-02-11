from db import db
import hashlib
import secrets
import string
import random
from datetime import datetime, timedelta
import json
import os
from typing import Optional, Dict, List, Tuple

class UserManager:
    @staticmethod
    def generate_login(base_name: Optional[str] = None) -> str:
        """Генерация логина"""
        if base_name:
            # Для детей: child_parentlogin_timestamp
            timestamp = datetime.now().strftime('%H%M%S')
            return f"child_{base_name}_{timestamp}"
        
        # Для обычных пользователей
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"user_{timestamp}"

    @staticmethod
    def generate_password(length: int = 8) -> str:
        """Генерация пароля"""
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))

    @staticmethod
    def hash_password(password: str) -> str:
        """Хеширование пароля"""
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def create_user(telegram_id: int, first_name: str, login: Optional[str] = None, 
                   password: Optional[str] = None, role: str = 'parent') -> Optional[Dict]:
        """Создание нового пользователя"""
        try:
            if not login:
                login = UserManager.generate_login()
            if not password:
                password = UserManager.generate_password()
            
            # Проверяем уникальность логина
            existing = UserManager.get_user_by_login(login)
            if existing:
                return None
            
            hashed_password = UserManager.hash_password(password)
            created_at = datetime.now().isoformat()
            
            query = """
            INSERT INTO users (telegram_id, first_name, login, password, role, coins, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            result = db.execute_query(
                query, 
                (telegram_id, first_name, login, hashed_password, role, 5000, 1, created_at)
            )
            
            if result:
                return {
                    'id': result,
                    'telegram_id': telegram_id,
                    'first_name': first_name,
                    'login': login,
                    'role': role,
                    'raw_password': password,  # Возвращаем сырой пароль
                    'created_at': created_at,
                    'coins': 5000,
                    'is_active': 1
                }
            return None
        except Exception as e:
            print(f"Ошибка создания пользователя: {e}")
            return None

    # В user_manager.py в методе create_child_account убедитесь что:
@staticmethod
def create_child_account(parent_telegram_id: int, child_name: str, 
                       age: Optional[int] = None) -> Optional[Dict]:
    """Создание аккаунта ребенка и отправка данных в Telegram"""
    try:
        # Получаем данные родителя
        parent = UserManager.get_user_by_telegram_id(parent_telegram_id)
        if not parent:
            print(f"Родитель с telegram_id {parent_telegram_id} не найден")
            return None
        
        # Генерируем логин для ребенка на основе логина родителя
        base_name = parent['login'].replace('user_', '').replace('child_', '')
        login = UserManager.generate_login(base_name)
        
        # Генерируем пароль
        password = UserManager.generate_password(10)
        
        # ВАЖНО: Создаем пользователя-ребенка с ОТДЕЛЬНЫМ telegram_id
        # Для детей можно использовать отрицательные ID или генерировать уникальные
        # Временно используем parent_telegram_id * 1000 + random
        import random
        child_telegram_id = parent_telegram_id * 1000 + random.randint(1, 999)
        
        # Создаем пользователя-ребенка
        query = """
        INSERT INTO users (telegram_id, first_name, login, password, role, coins, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        created_at = datetime.now().isoformat()
        hashed_password = UserManager.hash_password(password)
        
        child_id = db.execute_query(
            query, 
            (child_telegram_id, child_name, login, hashed_password, 'child', 0, 1, created_at)
        )
        
        if not child_id:
            return None
        
        # Получаем созданного ребенка
        child = UserManager.get_user_by_id(child_id)
        
        # Добавляем ребенка в семью родителя
        family_query = """
        INSERT INTO family (user_id, name, age, relationship, created_at)
        VALUES (?, ?, ?, ?, ?)
        """
        
        family_id = db.execute_query(
            family_query,
            (parent['id'], child_name, age, 'child', created_at)
        )
        
        # Создаем связь родитель-ребенок
        db.execute_query(
            "INSERT INTO child_parent (parent_id, child_id, created_at) VALUES (?, ?, ?)",
            (parent['id'], child_id, created_at)
        )
        
        return {
            'parent': {
                'telegram_id': parent['telegram_id'],
                'name': parent['first_name'],
                'id': parent['id']
            },
            'child': {
                'id': child_id,
                'name': child_name,
                'age': age,
                'login': login,
                'password': password,
                'telegram_id': child_telegram_id,
                'login_instructions': f"""
Данные для входа в аккаунт ребенка "{child_name}":

👤 Логин: {login}
🔐 Пароль: {password}

Используйте эти данные для входа в приложение "Пингви" под аккаунтом ребенка.

⚠️ Сохраните эти данные! Пароль больше не будет показан.
                """
            }
        }
        
    except Exception as e:
        print(f"Ошибка создания аккаунта ребенка: {e}")
        return None

    @staticmethod
    def get_user_by_telegram_id(telegram_id: int) -> Optional[Dict]:
        """Получение пользователя по Telegram ID"""
        query = "SELECT * FROM users WHERE telegram_id = ?"
        return db.execute_query(query, (telegram_id,), fetch_one=True)

    @staticmethod
    def get_user_by_login(login: str) -> Optional[Dict]:
        """Получение пользователя по логину"""
        query = "SELECT * FROM users WHERE login = ?"
        return db.execute_query(query, (login,), fetch_one=True)

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict]:
        """Получение пользователя по ID"""
        query = "SELECT * FROM users WHERE id = ?"
        return db.execute_query(query, (user_id,), fetch_one=True)

    @staticmethod
    def authenticate_user(login: str, password: str) -> Optional[Dict]:
        """Аутентификация пользователя"""
        user = UserManager.get_user_by_login(login)
        if not user:
            return None
        
        hashed_input = UserManager.hash_password(password)
        if user['password'] == hashed_input:
            # Обновляем время последнего входа
            update_query = "UPDATE users SET last_login = ? WHERE id = ?"
            db.execute_query(update_query, (datetime.now().isoformat(), user['id']))
            
            return {
                'id': user['id'],
                'telegram_id': user['telegram_id'],
                'first_name': user['first_name'],
                'login': user['login'],
                'role': user.get('role', 'parent'),
                'coins': user.get('coins', 0)
            }
        return None

    @staticmethod
    def create_session(user_id: int, device_info: Optional[str] = None) -> Optional[Dict]:
        """Создание сессии"""
        try:
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(days=30)
            
            query = """
            INSERT INTO sessions (user_id, token, device_info, expires_at)
            VALUES (?, ?, ?, ?)
            """
            
            result = db.execute_query(
                query,
                (user_id, token, device_info, expires_at.isoformat())
            )
            
            if result:
                return {
                    'token': token,
                    'expires_at': expires_at.isoformat()
                }
            return None
        except Exception as e:
            print(f"Ошибка создания сессии: {e}")
            return None

    @staticmethod
    def validate_session(token: str) -> Optional[Dict]:
        """Проверка валидности сессии"""
        query = """
        SELECT s.*, u.telegram_id, u.first_name, u.login, u.role, u.coins
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
        """
        
        result = db.execute_query(
            query, 
            (token, datetime.now().isoformat()), 
            fetch_one=True
        )
        return result

    @staticmethod
    def delete_session(token: str) -> bool:
        """Удаление сессии"""
        query = "DELETE FROM sessions WHERE token = ?"
        result = db.execute_query(query, (token,))
        return result is not None

    @staticmethod
    def get_user_sessions(user_id: int) -> List[Dict]:
        """Получение активных сессий пользователя"""
        query = """
        SELECT * FROM sessions 
        WHERE user_id = ? AND expires_at > ?
        ORDER BY created_at DESC
        """
        
        return db.execute_query(
            query,
            (user_id, datetime.now().isoformat()),
            fetch_all=True
        ) or []

    @staticmethod
    def get_user_children(parent_id: int) -> List[Dict]:
        """Получение детей пользователя"""
        query = """
        SELECT u.* FROM users u
        JOIN child_parent cp ON u.id = cp.child_id
        WHERE cp.parent_id = ? AND u.role = 'child' AND u.is_active = 1
        ORDER BY u.created_at DESC
        """
        
        return db.execute_query(query, (parent_id,), fetch_all=True) or []

    @staticmethod
    def get_family_members(user_id: int) -> List[Dict]:
        """Получение членов семьи пользователя"""
        query = """
        SELECT * FROM family 
        WHERE user_id = ?
        ORDER BY created_at DESC
        """
        
        return db.execute_query(query, (user_id,), fetch_all=True) or []

    @staticmethod
    def migrate_from_json(json_file: str = "issued_data.json") -> int:
        """Миграция данных из JSON"""
        if not os.path.exists(json_file):
            print("📁 Файл JSON не найден")
            return 0
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            migrated = 0
            for telegram_id_str, user_data in data.items():
                telegram_id = int(telegram_id_str)
                
                # Проверяем, есть ли уже пользователь
                existing = UserManager.get_user_by_telegram_id(telegram_id)
                if existing:
                    continue
                
                # Создаем пользователя
                result = UserManager.create_user(
                    telegram_id=telegram_id,
                    first_name=user_data.get('first_name', ''),
                    login=user_data.get('login'),
                    password=user_data.get('password')
                )
                
                if result:
                    migrated += 1
                    print(f"  → Мигрирован пользователь {user_data.get('first_name')}")
            
            print(f"✅ Мигрировано {migrated} пользователей из JSON")
            return migrated
            
        except Exception as e:
            print(f"❌ Ошибка миграции: {e}")
            return 0