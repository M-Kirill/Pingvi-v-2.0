import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
import hashlib
import secrets

class Database:
    def __init__(self, db_path: str = 'pingvi.db'):
        self.db_path = db_path
        self.conn = None
        self.connect()

    def connect(self):
        """Создание соединения с БД"""
        try:
            # Проверяем существование файла БД
            if not os.path.exists(self.db_path):
                print(f"📁 Создаем новый файл БД: {self.db_path}")
            
            # Используем SQLite с настройками для многопоточности
            self.conn = sqlite3.connect(
                self.db_path,
                check_same_thread=False,  # Разрешаем использование из разных потоков
                timeout=30  # Таймаут для блокировок
            )
            self.conn.row_factory = sqlite3.Row  # Для получения словарей
            self.conn.execute("PRAGMA foreign_keys = ON")  # Включаем внешние ключи
            print("✅ Подключение к SQLite установлено")
            self.init_tables()
        except Exception as e:
            print(f"❌ Ошибка подключения к SQLite: {e}")
            self.conn = None
            raise

    def init_tables(self):
        """Создание всех таблиц если их нет"""
        cursor = self.conn.cursor()
        
        # Таблица пользователей (родители и дети)
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
        
        # Таблица сессий
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
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
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
        
        # Таблица истории начисления монет
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
        
        # Создаем индексы для производительности
        index_queries = [
            "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_login ON users(login)",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
            "CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id)",
            "CREATE INDEX IF NOT EXISTS idx_family_parent_id ON family_members(parent_id)",
            "CREATE INDEX IF NOT EXISTS idx_family_child_id ON family_members(child_id)",
            "CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id)"
        ]
        
        for query in index_queries:
            cursor.execute(query)
        
        self.conn.commit()
        print("✅ Все таблицы созданы/проверены")
    
    def ensure_connection(self):
        """Проверка и восстановление соединения при необходимости"""
        if not self.conn:
            print("⚠️ Соединение потеряно, переподключаемся...")
            self.connect()
            return
        
        try:
            # Проверяем что соединение живо
            self.conn.execute("SELECT 1").fetchone()
        except (sqlite3.Error, AttributeError):
            print("⚠️ Соединение неактивно, переподключаемся...")
            try:
                if self.conn:
                    self.conn.close()
            except:
                pass
            self.connect()
    
    def execute_query(self, query: str, params: tuple = None, fetch_one: bool = False, 
                     fetch_all: bool = False, commit: bool = True) -> Optional[Any]:
        """Универсальный метод выполнения запросов"""
        # Гарантируем соединение
        self.ensure_connection()
        
        if params is None:
            params = ()
        
        try:
            cursor = self.conn.cursor()
            cursor.execute(query, params)
            
            # Проверяем тип запроса
            query_type = query.strip().upper().split()[0]
            is_modifying = query_type in ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER']
            
            if is_modifying and commit:
                self.conn.commit()
                if query_type == 'INSERT':
                    return cursor.lastrowid
                return cursor.rowcount
            
            # Для SELECT запросов
            if fetch_one:
                row = cursor.fetchone()
                return dict(row) if row else None
            elif fetch_all:
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
            else:
                # Для запросов без возврата данных
                if commit:
                    self.conn.commit()
                return None
                
        except sqlite3.Error as e:
            print(f"❌ Ошибка выполнения запроса: {e}")
            print(f"Запрос: {query}")
            print(f"Параметры: {params}")
            if self.conn:
                self.conn.rollback()
            raise e
        except Exception as e:
            print(f"❌ Общая ошибка в execute_query: {e}")
            if self.conn:
                self.conn.rollback()
            raise e
    
    def begin_transaction(self):
        """Начало транзакции"""
        self.ensure_connection()
        self.conn.execute("BEGIN TRANSACTION")
    
    def commit_transaction(self):
        """Коммит транзакции"""
        if self.conn:
            self.conn.commit()
    
    def rollback_transaction(self):
        """Откат транзакции"""
        if self.conn:
            self.conn.rollback()

    def execute_many(self, query: str, params_list: List[tuple]) -> Optional[int]:
        """Выполнение массовых операций"""
        self.ensure_connection()
        try:
            cursor = self.conn.cursor()
            cursor.executemany(query, params_list)
            self.conn.commit()
            return cursor.rowcount
        except Exception as e:
            print(f"❌ Ошибка выполнения массового запроса: {e}")
            if self.conn:
                self.conn.rollback()
            return None

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
    
    def create_child_user(self, parent_id: int, child_name: str, login: str, 
                         password_hash: str) -> Optional[int]:
        """Создание пользователя-ребенка"""
        try:
            # Начинаем транзакцию
            self.begin_transaction()
            
            # Создаем пользователя-ребенка
            child_id = self.create_user(
                telegram_id=None,
                first_name=child_name,
                login=login,
                password_hash=password_hash,
                role='child',
                parent_id=parent_id
            )
            
            if not child_id:
                self.rollback_transaction()
                return None
            
            # Добавляем в таблицу членов семьи
            query = '''
            INSERT INTO family_members (parent_id, child_id, child_name)
            VALUES (?, ?, ?)
            '''
            self.execute_query(query, (parent_id, child_id, child_name), commit=False)
            
            # Коммитим транзакцию
            self.commit_transaction()
            return child_id
            
        except Exception as e:
            self.rollback_transaction()
            print(f"❌ Ошибка создания ребенка: {e}")
            return None
    
    def get_children_by_parent_id(self, parent_id: int) -> List[Dict]:
        """Получение всех детей родителя"""
        query = '''
        SELECT u.id, u.first_name, u.login, u.role, u.coins, 
               fm.child_name, fm.age, fm.relationship, fm.created_at
        FROM users u
        JOIN family_members fm ON u.id = fm.child_id
        WHERE fm.parent_id = ? AND u.role = 'child' AND u.is_active = 1
        ORDER BY fm.created_at DESC
        '''
        return self.execute_query(query, (parent_id,), fetch_all=True) or []
    
    def get_family_members(self, user_id: int) -> List[Dict]:
        """Получение членов семьи для отображения в приложении"""
        query = '''
        SELECT * FROM family_members 
        WHERE parent_id = ?
        ORDER BY created_at DESC
        '''
        return self.execute_query(query, (user_id,), fetch_all=True) or []
    
    def create_session(self, user_id: int, token: str, expires_at: str, device_info: str = "") -> Optional[int]:
        """Создание сессии"""
        # Убедимся, что expires_at в правильном формате
        query = """
        INSERT INTO sessions (user_id, token, device_info, expires_at)
        VALUES (?, ?, ?, ?)
        """
        return self.execute_query(query, (user_id, token, device_info, expires_at))
    

    def get_session_by_token(self, token: str) -> Optional[Dict]:
        """Получение сессии по токену"""
        query = """
        SELECT s.*, u.telegram_id, u.first_name, u.login, u.role, u.coins
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
        return result is not None and result > 0
    
    def create_task(self, user_id: int, title: str, description: str, type: str,
                   coins: int, start_date: str, end_date: str, 
                   assigned_to_id: Optional[int] = None, is_repeating: bool = False) -> Optional[int]:
        """Создание задачи"""
        query = '''
        INSERT INTO tasks (user_id, assigned_to_id, title, description, type, 
                          coins, start_date, end_date, is_repeating, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo')
        '''
        return self.execute_query(
            query, 
            (user_id, assigned_to_id, title, description, type, 
             coins, start_date, end_date, is_repeating)
        )
    
    def get_user_tasks(self, user_id: int, task_type: Optional[str] = None, 
                      status: Optional[str] = None) -> List[Dict]:
        """Получение задач пользователя"""
        query = '''
        SELECT t.*, u.first_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        WHERE t.user_id = ?
        '''
        params = [user_id]
        
        if task_type:
            query += " AND t.type = ?"
            params.append(task_type)
        
        if status:
            query += " AND t.status = ?"
            params.append(status)
        
        query += " ORDER BY t.created_at DESC"
        
        return self.execute_query(query, tuple(params), fetch_all=True) or []
    
    def update_task_status(self, task_id: int, user_id: int, status: str) -> bool:
        """Обновление статуса задачи"""
        query = '''
        UPDATE tasks 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND (user_id = ? OR assigned_to_id = ?)
        '''
        result = self.execute_query(query, (status, task_id, user_id, user_id))
        return result is not None and result > 0
    
    def add_coins(self, user_id: int, amount: int, task_id: Optional[int] = None, 
                 description: str = "") -> bool:
        """Добавление монет пользователю"""
        try:
            self.begin_transaction()
            
            # Обновляем баланс
            update_query = "UPDATE users SET coins = coins + ? WHERE id = ?"
            self.execute_query(update_query, (amount, user_id), commit=False)
            
            # Записываем транзакцию
            trans_query = '''
            INSERT INTO coin_transactions (user_id, task_id, amount, type, description)
            VALUES (?, ?, ?, 'earned', ?)
            '''
            self.execute_query(trans_query, (user_id, task_id, amount, description), commit=False)
            
            self.commit_transaction()
            return True
            
        except Exception as e:
            self.rollback_transaction()
            print(f"❌ Ошибка добавления монет: {e}")
            return False
    
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
        """Деструктор для автоматического закрытия соединения"""
        self.close()


def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token() -> str:
    """Генерация токена"""
    return secrets.token_urlsafe(32)

def cleanup_expired_sessions(self):
    """Очистка истекших сессий"""
    query = "DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')"
    result = self.execute_query(query)
    print(f"✅ Удалено {result} истекших сессий" if result else "✅ Нет истекших сессий")
# Синглтон экземпляр БД
db = Database()