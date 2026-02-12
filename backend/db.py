import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import hashlib
import secrets
from contextlib import contextmanager
import json

class Database:
    def __init__(self, db_path: str = 'pingvi.db'):
        self.db_path = db_path
        self.conn = None
        self.connect()

    def connect(self):
        """Создание соединения с БД"""
        try:
            if not os.path.exists(self.db_path):
                print(f"📁 Создаем новый файл БД: {self.db_path}")
            
            self.conn = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                timeout=30,
                isolation_level=None  # Автокоммит для простых запросов
            )
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA foreign_keys = ON")
            self.conn.execute("PRAGMA journal_mode = WAL")  # Улучшаем производительность
            print("✅ Подключение к SQLite установлено")
            self.init_tables()
        except Exception as e:
            print(f"❌ Ошибка подключения к SQLite: {e}")
            self.conn = None
            raise

    @contextmanager
    def transaction(self):
        """Контекстный менеджер для транзакций"""
        if self.conn is None:
            raise RuntimeError("Нет соединения с БД")
        
        try:
            self.conn.execute("BEGIN")
            yield
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

    def init_tables(self):
        """Создание всех таблиц если их нет"""
        with self.transaction():
            cursor = self.conn.cursor()
            
            # Таблица пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER UNIQUE,
                    first_name TEXT NOT NULL,
                    login TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'parent',
                    coins INTEGER DEFAULT 5000,
                    photo_url TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    parent_id INTEGER,
                    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
                )
            ''')
            
            # Таблица сессий с автоматической очисткой
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    device_info TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Таблица задач
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    assigned_to_id INTEGER,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    type VARCHAR(20) NOT NULL DEFAULT 'personal',
                    status VARCHAR(20) DEFAULT 'todo',
                    coins INTEGER DEFAULT 0,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    is_repeating BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
                )
            ''')
            
            # Таблица членов семьи
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS family_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    parent_id INTEGER NOT NULL,
                    child_id INTEGER NOT NULL,
                    child_name VARCHAR(255) NOT NULL,
                    age INTEGER,
                    avatar_url TEXT,
                    relationship TEXT DEFAULT 'child',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(parent_id, child_id),
                    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Таблица истории монет
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coin_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    task_id INTEGER,
                    amount INTEGER NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
                )
            ''')
            
            # Таблица для хранения уведомлений
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    type TEXT NOT NULL,
                    is_read INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Индексы для производительности
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
                "CREATE INDEX IF NOT EXISTS idx_users_login ON users(login)",
                "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
                "CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date)",
                "CREATE INDEX IF NOT EXISTS idx_family_parent_id ON family_members(parent_id)",
                "CREATE INDEX IF NOT EXISTS idx_family_child_id ON family_members(child_id)",
                "CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)"
            ]
            
            for index in indexes:
                cursor.execute(index)
            
            print("✅ Все таблицы созданы/проверены")

    def execute_query(self, query: str, params: tuple = None, fetch_one: bool = False, 
                     fetch_all: bool = False) -> Optional[Any]:
        """Универсальный метод выполнения запросов"""
        if self.conn is None:
            self.connect()
        
        if params is None:
            params = ()
        
        try:
            cursor = self.conn.cursor()
            cursor.execute(query, params)
            
            query_type = query.strip().upper().split()[0]
            
            if query_type in ['INSERT', 'UPDATE', 'DELETE']:
                self.conn.commit()
                if query_type == 'INSERT':
                    return cursor.lastrowid
                return cursor.rowcount
            
            if fetch_one:
                row = cursor.fetchone()
                return dict(row) if row else None
            elif fetch_all:
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
            else:
                return None
                
        except sqlite3.Error as e:
            print(f"❌ Ошибка выполнения запроса: {e}")
            print(f"Запрос: {query}")
            print(f"Параметры: {params}")
            self.conn.rollback()
            raise e

    # ========== User methods ==========
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Получение пользователя по ID"""
        query = "SELECT * FROM users WHERE id = ? AND is_active = 1"
        return self.execute_query(query, (user_id,), fetch_one=True)
    
    def get_user_by_telegram_id(self, telegram_id: int) -> Optional[Dict]:
        """Получение пользователя по Telegram ID"""
        query = "SELECT * FROM users WHERE telegram_id = ? AND is_active = 1"
        return self.execute_query(query, (telegram_id,), fetch_one=True)
    
    def get_user_by_login(self, login: str) -> Optional[Dict]:
        """Получение пользователя по логину"""
        query = "SELECT * FROM users WHERE login = ? AND is_active = 1"
        return self.execute_query(query, (login,), fetch_one=True)
    
    def create_user(self, telegram_id: Optional[int], first_name: str, login: str, 
                   password_hash: str, role: str = 'parent', parent_id: Optional[int] = None) -> Optional[int]:
        """Создание нового пользователя"""
        query = '''
        INSERT INTO users (telegram_id, first_name, login, password, role, parent_id)
        VALUES (?, ?, ?, ?, ?, ?)
        '''
        return self.execute_query(query, (telegram_id, first_name, login, password_hash, role, parent_id))
    
    def update_user(self, user_id: int, **kwargs) -> bool:
        """Обновление пользователя"""
        allowed_fields = ['first_name', 'photo_url', 'is_active', 'last_login']
        updates = []
        params = []
        
        for field in allowed_fields:
            if field in kwargs:
                updates.append(f"{field} = ?")
                params.append(kwargs[field])
        
        if not updates:
            return False
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        params.append(user_id)
        
        result = self.execute_query(query, tuple(params))
        return result > 0
    
    def get_user_with_stats(self, user_id: int) -> Optional[Dict]:
        """Получение пользователя со статистикой"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Получаем количество детей
        children = self.get_children_by_parent_id(user_id)
        user['children_count'] = len(children)
        
        # Получаем статистику задач
        tasks = self.get_user_tasks(user_id)
        user['tasks_count'] = len(tasks)
        user['completed_tasks'] = len([t for t in tasks if t.get('status') == 'completed'])
        
        # Получаем общее количество монет в семье
        family_coins = user['coins']
        for child in children:
            family_coins += child.get('coins', 0)
        user['family_coins'] = family_coins
        
        return user

    # ========== Child methods ==========
    
    def create_child_user(self, parent_id: int, child_name: str, login: str, 
                         password_hash: str, age: Optional[int] = None) -> Optional[int]:
        """Создание пользователя-ребенка"""
        try:
            with self.transaction():
                # Создаем пользователя
                child_id = self.create_user(
                    telegram_id=None,
                    first_name=child_name,
                    login=login,
                    password_hash=password_hash,
                    role='child',
                    parent_id=parent_id
                )
                
                if not child_id:
                    return None
                
                # Добавляем в семейные отношения
                query = '''
                INSERT INTO family_members (parent_id, child_id, child_name, age)
                VALUES (?, ?, ?, ?)
                '''
                self.execute_query(query, (parent_id, child_id, child_name, age))
                
                return child_id
                
        except Exception as e:
            print(f"❌ Ошибка создания ребенка: {e}")
            return None
    
    def get_children_by_parent_id(self, parent_id: int) -> List[Dict]:
        """Получение всех детей родителя"""
        query = '''
        SELECT 
            u.id, 
            u.first_name, 
            u.login, 
            u.role, 
            u.coins, 
            fm.child_name, 
            fm.age, 
            fm.relationship,
            fm.created_at
        FROM users u
        JOIN family_members fm ON u.id = fm.child_id
        WHERE fm.parent_id = ? AND u.role = 'child' AND u.is_active = 1
        ORDER BY fm.created_at DESC
        '''
        return self.execute_query(query, (parent_id,), fetch_all=True) or []
    
    def get_child_by_id(self, child_id: int, parent_id: int) -> Optional[Dict]:
        """Получение конкретного ребенка по ID"""
        query = '''
        SELECT 
            u.*,
            fm.child_name,
            fm.age,
            fm.relationship
        FROM users u
        JOIN family_members fm ON u.id = fm.child_id
        WHERE fm.child_id = ? AND fm.parent_id = ? AND u.is_active = 1
        '''
        return self.execute_query(query, (child_id, parent_id), fetch_one=True)

    # ========== Session methods ==========
    
    def create_session(self, user_id: int, token: str, expires_at: str, device_info: str = "") -> Optional[int]:
        """Создание сессии"""
        query = """
        INSERT INTO sessions (user_id, token, device_info, expires_at)
        VALUES (?, ?, ?, ?)
        """
        return self.execute_query(query, (user_id, token, device_info, expires_at))
    
    def get_session_by_token(self, token: str) -> Optional[Dict]:
        """Получение сессии по токену"""
        query = """
        SELECT 
            s.*, 
            u.telegram_id, 
            u.first_name, 
            u.login, 
            u.role, 
            u.coins,
            u.photo_url
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? 
        AND datetime(s.expires_at) > datetime('now', 'localtime')
        AND u.is_active = 1
        """
        return self.execute_query(query, (token,), fetch_one=True)
    
    def delete_session(self, token: str) -> bool:
        """Удаление сессии"""
        query = "DELETE FROM sessions WHERE token = ?"
        result = self.execute_query(query, (token,))
        return result > 0
    
    def cleanup_expired_sessions(self) -> int:
        """Очистка истекших сессий"""
        query = "DELETE FROM sessions WHERE datetime(expires_at) < datetime('now', 'localtime')"
        result = self.execute_query(query)
        return result

    # ========== Task methods ==========
    
    def create_task(self, user_id: int, title: str, description: str, task_type: str,
                   coins: int, start_date: str, end_date: str, 
                   assigned_to_id: Optional[int] = None, is_repeating: bool = False) -> Optional[int]:
        """Создание задачи"""
        query = '''
        INSERT INTO tasks (
            user_id, assigned_to_id, title, description, type, 
            coins, start_date, end_date, is_repeating, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo')
        '''
        return self.execute_query(
            query, 
            (user_id, assigned_to_id, title, description, task_type, 
             coins, start_date, end_date, is_repeating)
        )
    
    def get_user_tasks(self, user_id: int, task_type: Optional[str] = None, 
                      status: Optional[str] = None) -> List[Dict]:
        """Получение задач пользователя"""
        query = '''
        SELECT 
            t.*,
            u.first_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        WHERE t.user_id = ? OR t.assigned_to_id = ?
        '''
        params = [user_id, user_id]
        
        if task_type:
            query += " AND t.type = ?"
            params.append(task_type)
        
        if status:
            query += " AND t.status = ?"
            params.append(status)
        
        query += " ORDER BY t.created_at DESC"
        
        return self.execute_query(query, tuple(params), fetch_all=True) or []
    
    def get_task_by_id(self, task_id: int, user_id: int) -> Optional[Dict]:
        """Получение задачи по ID с проверкой прав"""
        query = '''
        SELECT 
            t.*,
            u.first_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        WHERE t.id = ? AND (t.user_id = ? OR t.assigned_to_id = ?)
        '''
        return self.execute_query(query, (task_id, user_id, user_id), fetch_one=True)
    
    def update_task_status(self, task_id: int, user_id: int, status: str) -> bool:
        """Обновление статуса задачи"""
        query = '''
        UPDATE tasks 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND (user_id = ? OR assigned_to_id = ?)
        '''
        result = self.execute_query(query, (status, task_id, user_id, user_id))
        return result > 0
    
    def update_task(self, task_id: int, user_id: int, **kwargs) -> bool:
        """Обновление задачи"""
        allowed_fields = ['title', 'description', 'status']
        updates = []
        params = []
        
        for field in allowed_fields:
            if field in kwargs:
                updates.append(f"{field} = ?")
                params.append(kwargs[field])
        
        if not updates:
            return False
        
        query = f"""
        UPDATE tasks 
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND (user_id = ? OR assigned_to_id = ?)
        """
        params.extend([task_id, user_id, user_id])
        
        result = self.execute_query(query, tuple(params))
        return result > 0
    
    def delete_task(self, task_id: int, user_id: int) -> bool:
        """Удаление задачи"""
        query = "DELETE FROM tasks WHERE id = ? AND user_id = ?"
        result = self.execute_query(query, (task_id, user_id))
        return result > 0
    
    def get_tasks_for_date(self, user_id: int, date: str) -> List[Dict]:
        """Получение задач на конкретную дату"""
        query = '''
        SELECT 
            t.*,
            u.first_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        WHERE (t.user_id = ? OR t.assigned_to_id = ?)
        AND DATE(t.start_date) <= DATE(?)
        AND DATE(t.end_date) >= DATE(?)
        ORDER BY t.created_at DESC
        '''
        return self.execute_query(query, (user_id, user_id, date, date), fetch_all=True) or []

    # ========== Coin methods ==========
    
    def add_coins(self, user_id: int, amount: int, task_id: Optional[int] = None, 
                 description: str = "") -> bool:
        """Добавление монет пользователю"""
        try:
            with self.transaction():
                # Обновляем баланс
                update_query = "UPDATE users SET coins = coins + ? WHERE id = ?"
                self.execute_query(update_query, (amount, user_id))
                
                # Записываем транзакцию
                trans_query = '''
                INSERT INTO coin_transactions (user_id, task_id, amount, type, description)
                VALUES (?, ?, ?, 'earned', ?)
                '''
                self.execute_query(trans_query, (user_id, task_id, amount, description))
                
                return True
                
        except Exception as e:
            print(f"❌ Ошибка добавления монет: {e}")
            return False
    
    def get_coin_transactions(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Получение истории транзакций"""
        query = '''
        SELECT * FROM coin_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
        '''
        return self.execute_query(query, (user_id, limit), fetch_all=True) or []

    # ========== Family methods ==========
    
    def get_family_members(self, user_id: int) -> List[Dict]:
        """Получение всех членов семьи"""
        # Получаем детей
        children = self.get_children_by_parent_id(user_id)
        
        # Получаем родителя
        parent = self.get_user_by_id(user_id)
        if parent:
            parent_info = {
                'id': parent['id'],
                'first_name': parent['first_name'],
                'role': parent['role'],
                'coins': parent['coins'],
                'relationship': 'parent'
            }
            return [parent_info] + children
        
        return children
    
    def remove_child(self, parent_id: int, child_id: int) -> bool:
        """Удаление ребенка из семьи"""
        query = "DELETE FROM family_members WHERE parent_id = ? AND child_id = ?"
        result = self.execute_query(query, (parent_id, child_id))
        return result > 0

    # ========== Notification methods ==========
    
    def create_notification(self, user_id: int, title: str, message: str, 
                           notification_type: str = 'info') -> Optional[int]:
        """Создание уведомления"""
        query = '''
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
        '''
        return self.execute_query(query, (user_id, title, message, notification_type))
    
    def get_user_notifications(self, user_id: int, unread_only: bool = False) -> List[Dict]:
        """Получение уведомлений пользователя"""
        query = "SELECT * FROM notifications WHERE user_id = ?"
        params = [user_id]
        
        if unread_only:
            query += " AND is_read = 0"
        
        query += " ORDER BY created_at DESC LIMIT 50"
        
        return self.execute_query(query, tuple(params), fetch_all=True) or []
    
    def mark_notification_read(self, notification_id: int, user_id: int) -> bool:
        """Отметить уведомление как прочитанное"""
        query = "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?"
        result = self.execute_query(query, (notification_id, user_id))
        return result > 0

    def close(self):
        """Закрытие соединения с БД"""
        if self.conn:
            try:
                self.conn.close()
                print("🔌 Соединение с БД закрыто")
            except:
                pass
            finally:
                self.conn = None
    
    def __del__(self):
        self.close()

# ========== Helper functions ==========

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Генерация токена"""
    return secrets.token_urlsafe(32)

# Синглтон
db = Database()