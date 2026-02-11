from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import requests
import secrets
import hashlib
import json
import os
import socket
import atexit

from db import db, hash_password, generate_token

# Проверяем доступность Cloudflare Tunnel
try:
    from cloudflare_tunnel import cloudflare_tunnel
    CLOUDFLARE_AVAILABLE = True
    print("✅ Cloudflare Tunnel модуль загружен")
except ImportError as e:
    print(f"⚠️ Модуль cloudflare_tunnel не найден. Запуск без туннеля: {e}")
    CLOUDFLARE_AVAILABLE = False
    cloudflare_tunnel = None

# Модели запросов/ответов
class LoginRequest(BaseModel):
    login: str
    password: str
    device_info: str = ""

class ChildCreateRequest(BaseModel):
    name: str
    age: Optional[int] = None

class ChildCreateResponse(BaseModel):
    success: bool
    message: str
    child_name: str
    child_id: Optional[int] = None

class AuthResponse(BaseModel):
    success: bool
    message: str
    token: str = None
    user: dict = None
    expires_at: str = None

class UserResponse(BaseModel):
    id: int
    telegram_id: Optional[int]
    first_name: str
    login: str
    role: str
    coins: int
    created_at: str

class TaskCreate(BaseModel):
    title: str
    description: str
    type: str = "personal"
    coins: int = 0
    start_date: str
    end_date: str
    is_repeating: bool = False
    child_id: Optional[int] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    photo_url: Optional[str] = None

# Конфигурация Telegram бота
TELEGRAM_BOT_TOKEN = "8435081779:AAEd-5lTccA2DtsCQQmXZRSZDNDm3l48Has"
TELEGRAM_BOT_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

async def send_telegram_message(chat_id: int, message: str):
    """Отправка сообщения в Telegram"""
    try:
        url = f"{TELEGRAM_BOT_URL}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: requests.post(url, json=payload, timeout=10)
        )
        
        if response.status_code == 200:
            print(f"✅ Сообщение отправлено в Telegram для chat_id: {chat_id}")
            return True
        else:
            print(f"⚠️ Ошибка отправки в Telegram: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"⚠️ Ошибка отправки в Telegram: {e}")
        return False

async def notify_telegram_bot(telegram_id: int, child_name: str, login: str, password: str):
    """Отправка уведомления в Telegram бот о создании ребенка"""
    try:
        message = f"""
👶 <b>СОЗДАН НОВЫЙ АККАУНТ РЕБЕНКА</b>

<b>Имя ребенка:</b> {child_name}
<b>Логин:</b> <code>{login}</code>
<b>Пароль:</b> <code>{password}</code>

<b>Инструкция:</b>
1. Используйте эти данные для входа в приложение под аккаунтом ребенка
2. Сохраните пароль - он больше не будет показан
3. Ребенок появится в вашем списке семьи

⚠️ <b>Не передавайте пароль третьим лицам!</b>
        """
        
        success = await send_telegram_message(telegram_id, message)
        
        # Дополнительное сообщение для легкого копирования
        copy_message = f"""
Для копирования:
ЛОГИН: {login}
ПАРОЛЬ: {password}
        """
        await send_telegram_message(telegram_id, copy_message)
        
        return success
        
    except Exception as e:
        print(f"⚠️ Ошибка уведомления в Telegram: {e}")
        return False

def cleanup_expired_sessions():
    """Очистка истекших сессий"""
    try:
        result = db.execute_query(
            "DELETE FROM sessions WHERE datetime(expires_at) < datetime('now', 'localtime')"
        )
        if result:
            print(f"🗑️ Удалено {result} истекших сессий")
        return result or 0
    except Exception as e:
        print(f"⚠️ Ошибка очистки сессий: {e}")
        return 0

def get_local_ip():
    """Получение локального IP адреса"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("🚀 Запуск Pingvi Family API...")
    
    # Получаем IP адрес
    local_ip = get_local_ip()
    
    # Запускаем Cloudflare Tunnel если доступен
    public_url = None
    if CLOUDFLARE_AVAILABLE and cloudflare_tunnel:
        try:
            print("🌐 Инициализация Cloudflare Tunnel...")
            # Убедимся, что tunnel использует правильный порт (8080)
            if cloudflare_tunnel.port != 8080:
                cloudflare_tunnel.port = 8080
                print(f"🔧 Установлен порт Cloudflare Tunnel: 8080")
            
            public_url = cloudflare_tunnel.start()
            
            if public_url:
                print(f"✅ Cloudflare Tunnel запущен!")
                print(f"🔗 Публичный URL: {public_url}")
                print("📱 Используйте этот URL в мобильном приложении")
                
                # Покажем полную информацию
                print(f"\n🌐 Cloudflare Tunnel активен!")
                print(f"   URL: {public_url}")
                print(f"   Проксирует: http://localhost:8080")
                print(f"   Может занять 1-2 минуты для полной доступности")
            else:
                print("⚠️ Cloudflare Tunnel не запущен")
        except Exception as e:
            print(f"⚠️ Ошибка запуска Cloudflare Tunnel: {e}")
    else:
        print("⚠️ Cloudflare Tunnel не доступен")
    
    print("📊 Проверка таблиц...")
    try:
        test = db.execute_query("SELECT 1 as test", fetch_one=True)
        print("✅ Подключение к базе данных успешно")
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
        raise
    
    # Очищаем старые сессии при запуске
    cleaned = cleanup_expired_sessions()
    print(f"✅ Очищено {cleaned} истекших сессий")
    
    # Показываем все доступные адреса
    print("\n📡 ДОСТУПНЫЕ АДРЕСА:")
    print(f"   • Локальный: http://localhost:8080")
    print(f"   • Сеть: http://{local_ip}:8080")
    if public_url:
        print(f"   • Cloudflare Tunnel: {public_url}")
        print(f"   • (доступен из интернета)")
    else:
        print(f"   • Cloudflare Tunnel: не запущен")
    print("📱 Для iOS используйте Cloudflare URL")
    print("=" * 60)
    
    yield
    
    # Shutdown
    print("🛑 Остановка API...")
    # Останавливаем Cloudflare Tunnel если запущен
    if CLOUDFLARE_AVAILABLE and cloudflare_tunnel:
        cloudflare_tunnel.stop()
    db.close()

# Создаем app с lifespan
app = FastAPI(
    title="Pingvi Family API", 
    version="2.0.0",
    lifespan=lifespan
)

# Регистрируем обработчик для корректного завершения
if CLOUDFLARE_AVAILABLE and cloudflare_tunnel:
    atexit.register(cloudflare_tunnel.stop)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds() * 1000
    
    if request.url.path.startswith("/api/"):
        print(f"{request.method} {request.url.path} - {response.status_code} [{process_time:.2f}ms]")
    
    return response

# Зависимость для проверки токена
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Требуется авторизация. Добавьте заголовок Authorization")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Неверный формат токена. Используйте 'Bearer <token>'")
    
    token = authorization.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(status_code=401, detail="Токен не может быть пустым")
    
    session = db.get_session_by_token(token)
    
    if not session:
        cleanup_expired_sessions()
        raise HTTPException(
            status_code=401, 
            detail="Невалидный или просроченный токен. Пожалуйста, войдите снова."
        )
    
    return {
        "user_id": session["user_id"],
        "telegram_id": session["telegram_id"],
        "first_name": session["first_name"],
        "login": session["login"],
        "role": session["role"],
        "coins": session["coins"],
        "token": token
    }

# Эндпоинты API
@app.get("/")
async def root():
    return {
        "api": "Pingvi Family API",
        "version": "2.0.0",
        "status": "running",
        "database": "SQLite",
        "timestamp": datetime.now().isoformat(),
        "telegram_bot": True,
        "features": [
            "Аутентификация родителей и детей",
            "Управление детьми",
            "Создание задач",
            "Система монет",
            "Интеграция с Telegram ботом"
        ]
    }

@app.get("/api/health")
async def health_check():
    """Эндпоинт для проверки здоровья сервера"""
    try:
        test_query = db.execute_query("SELECT 1 as test", fetch_one=True)
        
        active_sessions = db.execute_query(
            "SELECT COUNT(*) as count FROM sessions WHERE datetime(expires_at) > datetime('now')",
            fetch_one=True
        )
        
        user_count = db.execute_query(
            "SELECT COUNT(*) as count FROM users WHERE is_active = 1",
            fetch_one=True
        )
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "pingvi-family-api",
            "database": "connected" if test_query else "disconnected",
            "stats": {
                "active_sessions": active_sessions['count'] if active_sessions else 0,
                "active_users": user_count['count'] if user_count else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {str(e)}")

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    """Авторизация пользователя"""
    try:
        user = db.get_user_by_login(data.login)
        
        if not user:
            raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        
        password_hash = hash_password(data.password)
        if user['password'] != password_hash:
            raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        
        if not user.get('is_active', 1):
            raise HTTPException(status_code=403, detail="Аккаунт заблокирован")
        
        # Очищаем старые сессии этого пользователя
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
            device_info=data.device_info
        )
        
        if not session_id:
            raise HTTPException(status_code=500, detail="Ошибка создания сессии")
        
        # Обновляем время последнего входа
        db.execute_query(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), user['id'])
        )
        
        return AuthResponse(
            success=True,
            message="Авторизация успешна",
            token=token,
            user={
                "id": user['id'],
                "telegram_id": user['telegram_id'],
                "first_name": user['first_name'],
                "login": user['login'],
                "role": user['role'],
                "coins": user['coins']
            },
            expires_at=expires_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка логина: {e}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

@app.post("/api/auth/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Продление срока действия токена"""
    try:
        old_token = current_user['token']
        
        new_token = generate_token()
        expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        
        session_id = db.create_session(
            user_id=current_user['user_id'],
            token=new_token,
            expires_at=expires_at,
            device_info="refreshed"
        )
        
        if not session_id:
            raise HTTPException(status_code=500, detail="Ошибка обновления токена")
        
        db.delete_session(old_token)
        
        return {
            "success": True,
            "message": "Токен обновлен",
            "token": new_token,
            "expires_at": expires_at
        }
        
    except Exception as e:
        print(f"❌ Ошибка обновления токена: {e}")
        raise HTTPException(status_code=500, detail="Ошибка обновления токена")

@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Выход из системы"""
    try:
        success = db.delete_session(current_user['token'])
        return {"success": success, "message": "Выход выполнен"}
    except Exception as e:
        print(f"❌ Ошибка выхода: {e}")
        raise HTTPException(status_code=500, detail="Ошибка выхода из системы")

@app.get("/api/auth/validate")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Проверка валидности токена"""
    try:
        session = db.get_session_by_token(current_user['token'])
        
        if not session:
            raise HTTPException(status_code=401, detail="Токен не найден или истек")
        
        user = db.get_user_by_id(current_user['user_id'])
        if not user or not user.get('is_active', 1):
            raise HTTPException(status_code=401, detail="Пользователь заблокирован")
        
        return {
            "valid": True,
            "user": {
                "id": current_user['user_id'],
                "telegram_id": current_user['telegram_id'],
                "first_name": current_user['first_name'],
                "login": current_user['login'],
                "role": current_user['role'],
                "coins": current_user['coins']
            },
            "expires_at": session['expires_at'],
            "remaining_days": (
                datetime.strptime(session['expires_at'], '%Y-%m-%d %H:%M:%S') - datetime.now()
            ).days if session['expires_at'] else None,
            "message": "Токен валиден"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка валидации токена: {e}")
        raise HTTPException(status_code=500, detail="Ошибка проверки токена")

# Регистрация пользователя через Telegram бота
class RegisterRequest(BaseModel):
    telegram_id: int
    first_name: str
    login: Optional[str] = None
    password: Optional[str] = None

@app.post("/api/users/register")
async def register_user(data: RegisterRequest):
    """Регистрация нового пользователя через Telegram"""
    try:
        # Проверяем уникальность telegram_id
        existing_telegram = db.get_user_by_telegram_id(data.telegram_id)
        if existing_telegram:
            return {
                "success": True,
                "message": "Пользователь уже зарегистрирован",
                "user_id": existing_telegram['id'],
                "login": existing_telegram['login'],
                "password": None  # Пароль не возвращаем
            }
        
        # Генерируем логин и пароль если не указаны
        if not data.login:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            data.login = f"user_{timestamp}"
        
        if not data.password:
            import random, string
            data.password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Создаем пользователя
        password_hash = hash_password(data.password)
        user_id = db.create_user(
            telegram_id=data.telegram_id,
            first_name=data.first_name,
            login=data.login,
            password_hash=password_hash,
            role='parent'
        )
        
        if not user_id:
            raise HTTPException(status_code=500, detail="Ошибка создания пользователя")
        
        # Создаем сессию
        token = generate_token()
        expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        
        db.create_session(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            device_info="telegram_registered"
        )
        
        # Отправляем сообщение в Telegram
        message = f"""
<b>РЕГИСТРАЦИЯ УСПЕШНА!</b>

<b>Ваши данные для входа:</b>
<b>Логин:</b> <code>{data.login}</code>
<b>Пароль:</b> <code>{data.password}</code>

<b>Инструкция:</b>
1. Скачайте приложение "Пингви"
2. Войдите используя эти данные
3. Начните пользоваться всеми функциями

⚠️ <b>Сохраните эти данные!</b>
        """
        
        await send_telegram_message(data.telegram_id, message)
        
        return {
            "success": True,
            "message": "Пользователь успешно зарегистрирован",
            "user_id": user_id,
            "login": data.login,
            "password": data.password,  # Возвращаем только для API
            "telegram_notified": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка регистрации: {e}")
        raise HTTPException(status_code=500, detail="Ошибка регистрации пользователя")

@app.get("/api/users/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Получение профиля пользователя"""
    try:
        user = db.get_user_by_id(current_user['user_id'])
        
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return UserResponse(
            id=user['id'],
            telegram_id=user['telegram_id'],
            first_name=user['first_name'],
            login=user['login'],
            role=user['role'],
            coins=user['coins'],
            created_at=user['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка получения профиля: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения профиля")

@app.get("/api/users/children")
async def get_user_children(current_user: dict = Depends(get_current_user)):
    """Получение детей пользователя"""
    try:
        children = db.get_children_by_parent_id(current_user['user_id'])
        return {"success": True, "children": children}
    except Exception as e:
        print(f"❌ Ошибка получения детей: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения списка детей")

@app.post("/api/children/create", response_model=ChildCreateResponse)
async def create_child(
    child_data: ChildCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Создание аккаунта ребенка"""
    try:
        print(f"👶 Создание ребенка: {child_data.name}, возраст: {child_data.age}")
        
        if not child_data.name or len(child_data.name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Имя должно содержать хотя бы 2 символа")
        
        if child_data.age is not None and (child_data.age < 1 or child_data.age > 18):
            raise HTTPException(status_code=400, detail="Возраст должен быть от 1 до 18 лет")
        
        # Генерируем логин и пароль для ребенка
        timestamp = datetime.now().strftime('%H%M%S')
        login = f"child_{current_user['login']}_{timestamp}"
        password = secrets.token_urlsafe(8)[:10]
        
        print(f"📝 Создаем аккаунт: логин={login}, пароль={password}")
        
        # Создаем пользователя-ребенка
        child_id = db.create_child_user(
            parent_id=current_user['user_id'],
            child_name=child_data.name,
            login=login,
            password_hash=hash_password(password)
        )
        
        if not child_id:
            raise HTTPException(status_code=500, detail="Не удалось создать аккаунт ребенка")
        
        # Если указан возраст, обновляем в family_members
        if child_data.age is not None:
            db.execute_query(
                "UPDATE family_members SET age = ? WHERE child_id = ?",
                (child_data.age, child_id)
            )
        
        # Отправляем данные в Telegram бот в фоновом режиме
        if current_user.get('telegram_id'):
            print(f"📨 Отправляем данные в Telegram для user_id: {current_user['telegram_id']}")
            background_tasks.add_task(
                notify_telegram_bot,
                telegram_id=current_user['telegram_id'],
                child_name=child_data.name,
                login=login,
                password=password
            )
        else:
            print(f"⚠️ У пользователя нет telegram_id, уведомление не отправлено")
        
        print(f"✅ Ребенок создан: ID={child_id}")
        
        return ChildCreateResponse(
            success=True,
            message=f"Аккаунт для {child_data.name} создан! Логин и пароль отправлены в Telegram.",
            child_name=child_data.name,
            child_id=child_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка создания ребенка: {e}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

# Эндпоинт для получения данных ребенка через Telegram
@app.get("/api/telegram/child-data/{telegram_id}")
async def get_child_data(telegram_id: int):
    """Получение данных о ребенке для Telegram бота"""
    try:
        # Получаем родителя по telegram_id
        parent = db.get_user_by_telegram_id(telegram_id)
        if not parent:
            return {"success": False, "message": "Пользователь не найден"}
        
        # Получаем детей родителя
        children = db.get_children_by_parent_id(parent['id'])
        
        if not children:
            return {"success": True, "has_children": False, "message": "У вас пока нет детей", "children": []}
        
        # Формируем данные для ответа
        child_data = []
        for child in children:
            # Получаем логин ребенка
            child_user = db.get_user_by_id(child['id'])
            if child_user:
                child_data.append({
                    "name": child.get('child_name', child['first_name']),
                    "age": child.get('age'),
                    "login": child_user['login'],
                    "coins": child_user['coins']
                })
        
        return {
            "success": True,
            "has_children": True,
            "message": f"Найдено {len(child_data)} детей",
            "children": child_data
        }
        
    except Exception as e:
        print(f"❌ Ошибка получения данных ребенка: {e}")
        return {"success": False, "message": "Внутренняя ошибка сервера"}

# Эндпоинт для получения данных пользователя через Telegram
@app.get("/api/telegram/user-data/{telegram_id}")
async def get_user_data(telegram_id: int):
    """Получение данных пользователя для Telegram бота"""
    try:
        user = db.get_user_by_telegram_id(telegram_id)
        if not user:
            return {"success": False, "message": "Пользователь не найден"}
        
        # Получаем детей
        children = db.get_children_by_parent_id(user['id'])
        
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "telegram_id": user['telegram_id'],
                "first_name": user['first_name'],
                "login": user['login'],
                "coins": user['coins'],
                "role": user['role']
            },
            "children_count": len(children) if children else 0
        }
        
    except Exception as e:
        print(f"❌ Ошибка получения данных пользователя: {e}")
        return {"success": False, "message": "Внутренняя ошибка сервера"}

# Эндпоинты для задач
@app.get("/api/tasks")
async def get_tasks(
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = None,
    status: Optional[str] = None
):
    """Получение задач пользователя"""
    try:
        user_id = current_user['user_id']
        tasks = db.get_user_tasks(user_id, type, status)
        
        for task in tasks:
            for date_field in ['start_date', 'end_date', 'created_at', 'updated_at']:
                if task.get(date_field):
                    if isinstance(task[date_field], datetime):
                        task[date_field] = task[date_field].isoformat()
        
        return {"success": True, "tasks": tasks}
        
    except Exception as e:
        print(f"❌ Ошибка получения задач: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения задач")

@app.post("/api/tasks")
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создание новой задачи"""
    try:
        user_id = current_user['user_id']
        
        if task_data.type == 'child' and not task_data.child_id:
            raise HTTPException(
                status_code=400, 
                detail="Для задач типа 'child' необходимо указать child_id"
            )
        
        if task_data.child_id:
            children = db.get_children_by_parent_id(user_id)
            child_ids = [child['id'] for child in children]
            if task_data.child_id not in child_ids:
                raise HTTPException(
                    status_code=403,
                    detail="Указанный ребенок не принадлежит вам"
                )
        
        task_id = db.create_task(
            user_id=user_id,
            title=task_data.title,
            description=task_data.description,
            type=task_data.type,
            coins=task_data.coins,
            start_date=task_data.start_date,
            end_date=task_data.end_date,
            assigned_to_id=task_data.child_id if task_data.type == 'child' else None,
            is_repeating=task_data.is_repeating
        )
        
        if not task_id:
            raise HTTPException(status_code=500, detail="Ошибка создания задачи")
        
        task = db.execute_query(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,),
            fetch_one=True
        )
        
        if task:
            for date_field in ['start_date', 'end_date', 'created_at', 'updated_at']:
                if task.get(date_field):
                    if isinstance(task[date_field], datetime):
                        task[date_field] = task[date_field].isoformat()
        
        return {
            "success": True,
            "message": "Задача создана",
            "task_id": task_id,
            "task": task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка создания задачи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка создания задачи")

@app.patch("/api/tasks/{task_id}")
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление задачи"""
    try:
        user_id = current_user['user_id']
        
        if task_update.status:
            success = db.update_task_status(task_id, user_id, task_update.status)
            if not success:
                raise HTTPException(status_code=404, detail="Задача не найдена")
            
            if task_update.status == 'completed':
                task = db.execute_query(
                    "SELECT * FROM tasks WHERE id = ?",
                    (task_id,),
                    fetch_one=True
                )
                
                if task and task['coins'] > 0:
                    assigned_to_id = task['assigned_to_id'] or user_id
                    db.add_coins(
                        user_id=assigned_to_id,
                        amount=task['coins'],
                        task_id=task_id,
                        description=f"Задача выполнена: {task['title']}"
                    )
                    
                    user = db.get_user_by_id(assigned_to_id)
                    message = f"Задача выполнена! Начислено {task['coins']} монет. Баланс: {user['coins']}"
                else:
                    message = "Статус задачи обновлен"
            else:
                message = "Статус задачи обновлен"
        
        else:
            updates = []
            params = []
            
            if task_update.title is not None:
                updates.append("title = ?")
                params.append(task_update.title)
            
            if task_update.description is not None:
                updates.append("description = ?")
                params.append(task_update.description)
            
            if updates:
                query = f"""
                UPDATE tasks 
                SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND (user_id = ? OR assigned_to_id = ?)
                """
                params.extend([task_id, user_id, user_id])
                
                result = db.execute_query(query, tuple(params))
                if not result or result == 0:
                    raise HTTPException(status_code=404, detail="Задача не найдена")
                
                message = "Задача обновлена"
            else:
                raise HTTPException(status_code=400, detail="Не указаны данные для обновления")
        
        return {"success": True, "message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка обновления задачи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка обновления задачи")

@app.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удаление задачи"""
    try:
        user_id = current_user['user_id']
        
        task = db.execute_query(
            "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
            (task_id, user_id),
            fetch_one=True
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Задача не найдена")
        
        result = db.execute_query(
            "DELETE FROM tasks WHERE id = ?",
            (task_id,)
        )
        
        if not result or result == 0:
            raise HTTPException(status_code=500, detail="Ошибка удаления задачи")
        
        return {"success": True, "message": "Задача удалена"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка удаления задачи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка удаления задачи")

# Эндпоинты для семьи
@app.get("/api/family")
async def get_family(current_user: dict = Depends(get_current_user)):
    """Получение членов семьи"""
    try:
        user_id = current_user['user_id']
        members = db.get_family_members(user_id)
        return {"success": True, "family": members}
    except Exception as e:
        print(f"❌ Ошибка получения семьи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения списка семьи")

@app.get("/api/profile")
async def get_full_profile(current_user: dict = Depends(get_current_user)):
    """Получение полного профиля пользователя"""
    try:
        user = db.get_user_by_id(current_user['user_id'])
        
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        children = db.get_children_by_parent_id(current_user['user_id'])
        tasks = db.get_user_tasks(current_user['user_id'])
        
        profile = {
            "user": user,
            "children": children,
            "tasks_count": len(tasks),
            "total_coins": user['coins']
        }
        
        return {"success": True, "profile": profile}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка получения профиля: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения профиля")

@app.patch("/api/profile")
async def update_profile(
    profile_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление профиля пользователя"""
    try:
        user_id = current_user['user_id']
        
        updates = []
        params = []
        
        if profile_update.first_name is not None:
            updates.append("first_name = ?")
            params.append(profile_update.first_name)
        
        if profile_update.photo_url is not None:
            updates.append("photo_url = ?")
            params.append(profile_update.photo_url)
        
        if updates:
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
            params.append(user_id)
            
            result = db.execute_query(query, tuple(params))
            if not result or result == 0:
                raise HTTPException(status_code=500, detail="Ошибка обновления профиля")
        
        return {"success": True, "message": "Профиль обновлен"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка обновления профиля: {e}")
        raise HTTPException(status_code=500, detail="Ошибка обновления профиля")

@app.get("/api/debug/sessions")
async def debug_sessions():
    """Эндпоинт для отладки сессий"""
    try:
        query = """
        SELECT 
            s.id,
            s.token,
            s.expires_at,
            u.login,
            u.first_name,
            CASE 
                WHEN datetime(s.expires_at) > datetime('now') THEN 'active'
                ELSE 'expired'
            END as status
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
        LIMIT 20
        """
        
        sessions = db.execute_query(query, fetch_all=True) or []
        
        return {
            "success": True,
            "total_sessions": len(sessions),
            "current_time": datetime.now().isoformat(),
            "sessions": sessions
        }
        
    except Exception as e:
        print(f"❌ Ошибка отладки сессий: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Эндпоинты для Cloudflare Tunnel
@app.get("/api/cloudflare-info")
async def get_cloudflare_info():
    """Получение информации о Cloudflare Tunnel подключении"""
    public_url = None
    if CLOUDFLARE_AVAILABLE and cloudflare_tunnel:
        public_url = cloudflare_tunnel.public_url
    
    return {
        "is_cloudflare": public_url is not None,
        "public_url": public_url,
        "local_url": "http://localhost:8080",
        "network_url": f"http://{get_local_ip()}:8080",
        "status": "running" if public_url else "stopped",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/network-info")
async def get_network_info():
    """Получение сетевой информации"""
    local_ip = get_local_ip()
    
    return {
        "local_ip": local_ip,
        "localhost": "localhost",
        "port": 8080,
        "available_urls": [
            f"http://localhost:8080",
            f"http://{local_ip}:8080"
        ],
        "platform": os.name,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/connection-info")
async def get_connection_info():
    """Полная информация о подключении"""
    local_ip = get_local_ip()
    
    info = {
        "server": {
            "name": "Pingvi Family API",
            "version": "2.0.0",
            "port": 8080,
            "host": "0.0.0.0"
        },
        "local_addresses": [
            f"http://localhost:8080",
            f"http://{local_ip}:8080"
        ],
        "timestamp": datetime.now().isoformat()
    }
    
    # Добавляем Cloudflare информацию если доступна
    if CLOUDFLARE_AVAILABLE and cloudflare_tunnel:
        info["cloudflare_tunnel"] = {
            "is_running": cloudflare_tunnel.is_running,
            "public_url": cloudflare_tunnel.public_url,
            "status": "running" if cloudflare_tunnel.is_running else "stopped"
        }
    
    return info

@app.get("/api/test-cloudflare")
async def test_cloudflare():
    """Тест Cloudflare Tunnel"""
    if not CLOUDFLARE_AVAILABLE or not cloudflare_tunnel:
        return {
            "success": False,
            "message": "Cloudflare Tunnel не доступен",
            "url": None
        }
    
    # Проверяем доступность через Cloudflare
    cloudflare_url = cloudflare_tunnel.public_url
    accessible = False
    
    if cloudflare_url:
        try:
            test_url = f"{cloudflare_url}/api/health"
            response = requests.get(test_url, timeout=10)
            accessible = response.status_code == 200
        except:
            accessible = False
    
    return {
        "success": True,
        "message": "Cloudflare Tunnel активен",
        "url": cloudflare_tunnel.public_url,
        "port": cloudflare_tunnel.port,
        "is_running": cloudflare_tunnel.is_running,
        "accessible": accessible,
        "test_endpoints": {
            "health": f"{cloudflare_tunnel.public_url}/api/health",
            "docs": f"{cloudflare_tunnel.public_url}/docs",
            "root": f"{cloudflare_tunnel.public_url}/"
        }
    }


@app.get("/api/mobile-config")
async def get_mobile_config():
    """Конфигурация для мобильного приложения"""
    local_ip = get_local_ip()
    
    config = {
        "API_BASE_URL": "http://localhost:8080",
        "CLOUDFLARE_URL": cloudflare_tunnel.public_url if CLOUDFLARE_AVAILABLE and cloudflare_tunnel else None,
        "LOCAL_URLS": [
            f"http://localhost:8080",
            f"http://{local_ip}:8080",
            "http://10.0.2.2:8080"  # Для Android эмулятора
        ],
        "TIMESTAMP": datetime.now().isoformat(),
        "SERVER_VERSION": "2.0.0",
        "CLOUDFLARE_AVAILABLE": CLOUDFLARE_AVAILABLE,
        "CLOUDFLARE_RUNNING": cloudflare_tunnel.is_running if CLOUDFLARE_AVAILABLE and cloudflare_tunnel else False
    }
    
    return config

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 Запуск Pingvi Family API...")
    print("📊 База данных: SQLite (pingvi.db)")
    print("🌐 Адрес: http://0.0.0.0:8080")
    print("🤖 Telegram bot интегрирован в API")
    print("📚 Документация: http://localhost:8080/docs")
    
    if CLOUDFLARE_AVAILABLE:
        print("🔄 Cloudflare Tunnel будет запущен автоматически")
    else:
        print("⚠️ Cloudflare Tunnel не настроен - используйте локальные адреса")
    
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0", 
        port=8080, 
        reload=True,
        log_level="info"
    )