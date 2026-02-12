from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import requests
import json
import os
import socket
import atexit

from db import db, hash_password, generate_token
from config import settings
from schemas import *
from services.user_service import UserService, ChildService, TaskService
from cloudflare_tunnel import cloudflare_tunnel

# ========== Lifespan ==========

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("🚀 Запуск Pingvi Family API v2.0")
    print("=" * 60)
    
    # Очищаем старые сессии
    cleaned = db.cleanup_expired_sessions()
    print(f"✅ Очищено {cleaned} истекших сессий")
    
    # Запускаем Cloudflare Tunnel
    #public_url = None
    ##try:
            #print("🌐 Инициализация Cloudflare Tunnel...")
            #cloudflare_tunnel.port = settings.CLOUDFLARE_TUNNEL_PORT
            #public_url = cloudflare_tunnel.start()
            
            #if public_url:
                ##print(f"🔗 Публичный URL: {public_url}")
        #except Exception as e:
           # print(f"⚠️ Ошибка запуска Cloudflare Tunnel: {e}")
        
    print(f"\n📡 Сервер запущен на порту {settings.API_PORT}")
    print(f"🌐 Доступен по адресам:")
    print(f"   • http://localhost:{settings.API_PORT}")
    print(f"   • http://127.0.0.1:{settings.API_PORT}")
    print(f"\n📡 Сервер запущен на порту {settings.API_PORT}")
    print("=" * 60)
    
    yield
    
    # Shutdown
    print("🛑 Остановка API...")
    #if cloudflare_tunnel:
        #cloudflare_tunnel.stop()
    db.close()

# ========== App initialization ==========

app = FastAPI(
    title="Pingvi Family API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Telegram helper ==========

async def send_telegram_message(chat_id: int, message: str):
    """Отправка сообщения в Telegram"""
    try:
        url = f"{settings.TELEGRAM_BOT_URL}{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
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
        
        return response.status_code == 200
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
        
        # Дополнительное сообщение для копирования
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

# ========== Dependency ==========

async def get_current_user(authorization: str = Header(None)):
    """Получение текущего пользователя по токену"""
    if not authorization:
        raise HTTPException(
            status_code=401, 
            detail={
                "success": False,
                "message": "Требуется авторизация",
                "error": "no_token"
            }
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail={
                "success": False,
                "message": "Неверный формат токена. Используйте 'Bearer <token>'",
                "error": "invalid_format"
            }
        )
    
    token = authorization.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(
            status_code=401, 
            detail={
                "success": False,
                "message": "Токен не может быть пустым",
                "error": "empty_token"
            }
        )
    
    session = db.get_session_by_token(token)
    
    if not session:
        db.cleanup_expired_sessions()
        raise HTTPException(
            status_code=401, 
            detail={
                "success": False,
                "message": "Невалидный или просроченный токен",
                "error": "invalid_token"
            }
        )
    
    return {
        "user_id": session["user_id"],
        "telegram_id": session["telegram_id"],
        "first_name": session["first_name"],
        "login": session["login"],
        "role": session["role"],
        "coins": session["coins"],
        "photo_url": session.get("photo_url"),
        "token": token
    }

# ========== API Endpoints ==========

@app.get("/", tags=["Root"])
async def root():
    """Корневой эндпоинт - информация об API"""
    return {
        "api": "Pingvi Family API",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "documentation": "/docs"
    }

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Проверка здоровья сервера"""
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
            "timestamp": datetime.now(),
            "service": "pingvi-family-api",
            "database": "connected" if test_query else "disconnected",
            "stats": {
                "active_sessions": active_sessions['count'] if active_sessions else 0,
                "active_users": user_count['count'] if user_count else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {str(e)}")

# ========== Auth endpoints ==========

@app.post("/api/auth/login", response_model=AuthResponse, tags=["Auth"])
async def login(data: LoginRequest):
    """Авторизация пользователя"""
    try:
        result = UserService.authenticate(data.login, data.password, data.device_info)
        
        if not result:
            raise HTTPException(
                status_code=401,
                detail={
                    "success": False,
                    "message": "Неверный логин или пароль"
                }
            )
        
        return {
            "success": True,
            "message": "Авторизация успешна",
            "token": result["token"],
            "user": result["user"],
            "expires_at": result["expires_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка логина: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "Внутренняя ошибка сервера"
            }
        )

@app.post("/api/auth/refresh", tags=["Auth"])
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Обновление токена"""
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

@app.post("/api/auth/logout", tags=["Auth"])
async def logout(current_user: dict = Depends(get_current_user)):
    """Выход из системы"""
    try:
        success = db.delete_session(current_user['token'])
        return {"success": success, "message": "Выход выполнен"}
    except Exception as e:
        print(f"❌ Ошибка выхода: {e}")
        raise HTTPException(status_code=500, detail="Ошибка выхода из системы")

@app.get("/api/auth/validate", tags=["Auth"])
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Проверка валидности токена"""
    try:
        session = db.get_session_by_token(current_user['token'])
        
        if not session:
            raise HTTPException(status_code=401, detail="Токен не найден или истек")
        
        user = db.get_user_by_id(current_user['user_id'])
        if not user or not user.get('is_active', 1):
            raise HTTPException(status_code=401, detail="Пользователь заблокирован")
        
        expires_at = datetime.strptime(session['expires_at'], '%Y-%m-%d %H:%M:%S')
        remaining_days = (expires_at - datetime.now()).days
        
        return {
            "valid": True,
            "user": {
                "id": current_user['user_id'],
                "telegram_id": current_user['telegram_id'],
                "first_name": current_user['first_name'],
                "login": current_user['login'],
                "role": current_user['role'],
                "coins": current_user['coins'],
                "photo_url": current_user.get('photo_url')
            },
            "expires_at": session['expires_at'],
            "remaining_days": remaining_days if remaining_days > 0 else 0,
            "message": "Токен валиден"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка валидации токена: {e}")
        raise HTTPException(status_code=500, detail="Ошибка проверки токена")

# ========== User endpoints ==========

@app.post("/api/users/register", tags=["Users"])
async def register_user(data: RegisterRequest):
    """Регистрация нового пользователя через Telegram"""
    try:
        result = UserService.register_via_telegram(data.telegram_id, data.first_name)
        
        if not result:
            raise HTTPException(status_code=500, detail="Ошибка регистрации пользователя")
        
        response = {
            "success": True,
            "message": "Пользователь зарегистрирован" if result['is_new'] else "Пользователь найден",
            "user_id": result['user_id'],
            "login": result['login'],
            "telegram_notified": True
        }
        
        if result.get('password'):
            response["password"] = result['password']
        
        # Отправляем сообщение в Telegram
        if result['is_new'] and result.get('password'):
            message = f"""
<b>✅ РЕГИСТРАЦИЯ УСПЕШНА!</b>

<b>Ваши данные для входа:</b>
<b>Логин:</b> <code>{result['login']}</code>
<b>Пароль:</b> <code>{result['password']}</code>

<b>Инструкция:</b>
1. Скачайте приложение "Пингви"
2. Войдите используя эти данные
3. Начните пользоваться всеми функциями

⚠️ <b>Сохраните эти данные!</b>
            """
            await send_telegram_message(data.telegram_id, message)
        
        return response
        
    except Exception as e:
        print(f"❌ Ошибка регистрации: {e}")
        raise HTTPException(status_code=500, detail="Ошибка регистрации пользователя")

@app.get("/api/users/profile", tags=["Users"])
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Получение профиля пользователя"""
    try:
        profile = UserService.get_profile(current_user['user_id'])
        
        if not profile:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return {"success": True, "profile": profile}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка получения профиля: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения профиля")

@app.patch("/api/users/profile", tags=["Users"])
async def update_profile(
    profile_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление профиля пользователя"""
    try:
        update_data = {}
        
        if profile_update.first_name:
            update_data['first_name'] = profile_update.first_name
        if profile_update.photo_url:
            update_data['photo_url'] = profile_update.photo_url
        
        success = db.update_user(current_user['user_id'], **update_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Ошибка обновления профиля")
        
        return {"success": True, "message": "Профиль обновлен"}
        
    except Exception as e:
        print(f"❌ Ошибка обновления профиля: {e}")
        raise HTTPException(status_code=500, detail="Ошибка обновления профиля")

# ========== Children endpoints ==========

@app.get("/api/users/children", tags=["Children"])
async def get_user_children(current_user: dict = Depends(get_current_user)):
    """Получение детей пользователя"""
    try:
        children = ChildService.get_children(current_user['user_id'])
        return {"success": True, "children": children}
    except Exception as e:
        print(f"❌ Ошибка получения детей: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения списка детей")

@app.post("/api/children/create", response_model=ChildCreateResponse, tags=["Children"])
async def create_child(
    child_data: ChildCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Создание аккаунта ребенка"""
    try:
        print(f"👶 Создание ребенка: {child_data.name}")
        
        result = ChildService.create_child(
            parent_id=current_user['user_id'],
            name=child_data.name,
            age=child_data.age
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Не удалось создать аккаунт ребенка")
        
        # Отправляем уведомление в Telegram
        if current_user.get('telegram_id'):
            background_tasks.add_task(
                notify_telegram_bot,
                telegram_id=current_user['telegram_id'],
                child_name=result['child_name'],
                login=result['login'],
                password=result['password']
            )
        
        return {
            "success": True,
            "message": f"Аккаунт для {result['child_name']} создан! Логин и пароль отправлены в Telegram.",
            "child_name": result['child_name'],
            "child_id": result['child_id']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка создания ребенка: {e}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

# ========== Task endpoints ==========

@app.get("/api/tasks", tags=["Tasks"])
async def get_tasks(
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None
):
    """Получение задач пользователя"""
    try:
        if date:
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                tasks = TaskService.get_tasks_for_date(current_user['user_id'], date_obj)
            except ValueError:
                tasks = db.get_user_tasks(current_user['user_id'], type, status)
        else:
            tasks = db.get_user_tasks(current_user['user_id'], type, status)
        
        # Конвертируем datetime в строки
        for task in tasks:
            for field in ['start_date', 'end_date', 'created_at', 'updated_at']:
                if task.get(field):
                    if isinstance(task[field], datetime):
                        task[field] = task[field].isoformat()
        
        return {"success": True, "tasks": tasks}
        
    except Exception as e:
        print(f"❌ Ошибка получения задач: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения задач")

@app.post("/api/tasks", tags=["Tasks"])
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создание новой задачи"""
    try:
        # Проверка прав для задач с детьми
        if task_data.type == TaskType.CHILD:
            if not task_data.child_id:
                raise HTTPException(
                    status_code=400,
                    detail="Для задач типа 'child' необходимо указать child_id"
                )
            
            # Проверяем, что ребенок принадлежит родителю
            children = ChildService.get_children(current_user['user_id'])
            child_ids = [child['id'] for child in children]
            if task_data.child_id not in child_ids:
                raise HTTPException(
                    status_code=403,
                    detail="Указанный ребенок не принадлежит вам"
                )
        
        task = TaskService.create_task(current_user['user_id'], task_data.model_dump())
        
        if not task:
            raise HTTPException(status_code=500, detail="Ошибка создания задачи")
        
        # Конвертируем даты
        for field in ['start_date', 'end_date', 'created_at', 'updated_at']:
            if task.get(field):
                if isinstance(task[field], datetime):
                    task[field] = task[field].isoformat()
        
        return {
            "success": True,
            "message": "Задача создана",
            "task_id": task['id'],
            "task": task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка создания задачи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка создания задачи")

@app.patch("/api/tasks/{task_id}", tags=["Tasks"])
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление задачи"""
    try:
        if task_update.status:
            if task_update.status == TaskStatus.COMPLETED:
                task = TaskService.complete_task(task_id, current_user['user_id'])
                if not task:
                    raise HTTPException(status_code=404, detail="Задача не найдена")
                
                message = f"Задача выполнена! Начислено {task['coins']} монет."
                if task.get('updated_coins'):
                    message += f" Баланс: {task['updated_coins']} монет"
            else:
                success = db.update_task_status(task_id, current_user['user_id'], task_update.status.value)
                if not success:
                    raise HTTPException(status_code=404, detail="Задача не найдена")
                message = f"Статус задачи обновлен на '{task_update.status.value}'"
        else:
            update_data = {}
            if task_update.title:
                update_data['title'] = task_update.title
            if task_update.description:
                update_data['description'] = task_update.description
            
            if not update_data:
                raise HTTPException(status_code=400, detail="Не указаны данные для обновления")
            
            success = db.update_task(task_id, current_user['user_id'], **update_data)
            if not success:
                raise HTTPException(status_code=404, detail="Задача не найдена")
            
            message = "Задача обновлена"
        
        return {"success": True, "message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка обновления задачи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка обновления задачи")

@app.delete("/api/tasks/{task_id}", tags=["Tasks"])
async def delete_task(
    task_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удаление задачи"""
    try:
        success = db.delete_task(task_id, current_user['user_id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Задача не найдена")
        
        return {"success": True, "message": "Задача удалена"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка удаления задачи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка удаления задачи")

# ========== Telegram endpoints ==========

@app.get("/api/telegram/child-data/{telegram_id}", tags=["Telegram"])
async def get_child_data(telegram_id: int):
    """Получение данных о ребенке для Telegram бота"""
    try:
        parent = db.get_user_by_telegram_id(telegram_id)
        if not parent:
            return {"success": False, "message": "Пользователь не найден"}
        
        children = ChildService.get_children(parent['id'])
        
        if not children:
            return {"success": True, "has_children": False, "message": "У вас пока нет детей", "children": []}
        
        child_data = []
        for child in children:
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

@app.get("/api/telegram/user-data/{telegram_id}", tags=["Telegram"])
async def get_user_data(telegram_id: int):
    """Получение данных пользователя для Telegram бота"""
    try:
        user = db.get_user_by_telegram_id(telegram_id)
        if not user:
            return {"success": False, "message": "Пользователь не найден"}
        
        children = ChildService.get_children(user['id'])
        
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "telegram_id": user['telegram_id'],
                "first_name": user['first_name'],
                "login": user['login'],
                "coins": user['coins'],
                "role": user['role'],
                "photo_url": user.get('photo_url')
            },
            "children_count": len(children)
        }
        
    except Exception as e:
        print(f"❌ Ошибка получения данных пользователя: {e}")
        return {"success": False, "message": "Внутренняя ошибка сервера"}

# ========== Family endpoints ==========

@app.get("/api/family", tags=["Family"])
async def get_family(current_user: dict = Depends(get_current_user)):
    """Получение членов семьи"""
    try:
        members = db.get_family_members(current_user['user_id'])
        return {"success": True, "family": members}
    except Exception as e:
        print(f"❌ Ошибка получения семьи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения списка семьи")

# ========== Cloudflare endpoints ==========

@app.get("/api/cloudflare-info", tags=["Cloudflare"])
async def get_cloudflare_info():
    """Получение информации о Cloudflare Tunnel"""
    public_url = None
    if cloudflare_tunnel:
        public_url = cloudflare_tunnel.public_url
    
    return {
        "is_cloudflare": public_url is not None,
        "public_url": public_url,
        "local_url": f"http://localhost:{settings.API_PORT}",
        "status": "running" if public_url else "stopped",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/mobile-config", tags=["Mobile"])
async def get_mobile_config():
    """Конфигурация для мобильного приложения"""
    config = {
        "API_BASE_URL": f"http://localhost:{settings.API_PORT}",
        "CLOUDFLARE_URL": cloudflare_tunnel.public_url if cloudflare_tunnel else None,
        "LOCAL_URLS": [
            f"http://localhost:{settings.API_PORT}",
            f"http://10.0.2.2:{settings.API_PORT}",  # Android эмулятор
        ],
        "TIMESTAMP": datetime.now().isoformat(),
        "SERVER_VERSION": "2.0.0",
        "CLOUDFLARE_AVAILABLE": cloudflare_tunnel is not None,
        "CLOUDFLARE_RUNNING": cloudflare_tunnel.is_running if cloudflare_tunnel else False
    }
    
    return config

# ========== Debug endpoints ==========

@app.get("/api/debug/sessions", tags=["Debug"])
async def debug_sessions():
    """Отладка сессий"""
    try:
        query = """
        SELECT 
            s.id,
            s.token,
            s.expires_at,
            u.login,
            u.first_name,
            u.role,
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

# ========== Main ==========

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 Запуск Pingvi Family API...")
    print(f"📊 База данных: SQLite ({db.db_path})")
    print(f"🌐 Адрес: http://{settings.API_HOST}:{settings.API_PORT}")
    print(f"📚 Документация: http://localhost:{settings.API_PORT}/docs")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
        log_level="info"
    )