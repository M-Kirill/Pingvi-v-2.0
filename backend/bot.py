import telebot
from telebot import types
import requests
import json
import time
import os
from datetime import datetime

TOKEN = "8435081779:AAEd-5lTccA2DtsCQQmXZRSZDNDm3l48Has"
# ВАЖНО: используем localhost для бота, который запущен на том же компьютере
API_URL = "http://127.0.0.1:8081"  # ИЗМЕНЕНО: localhost -> 127.0.0.1

bot = telebot.TeleBot(TOKEN)

def register_user(telegram_id: int, first_name: str):
    """Регистрация пользователя через API"""
    try:
        print(f"📤 Отправка запроса на {API_URL}/api/users/register")
        print(f"📦 Данные: telegram_id={telegram_id}, first_name={first_name}")
        
        response = requests.post(
            f"{API_URL}/api/users/register",
            json={
                "telegram_id": telegram_id,
                "first_name": first_name
            },
            timeout=10
        )
        
        print(f"📥 Статус ответа: {response.status_code}")
        print(f"📥 Тело ответа: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return {
                    "success": True,
                    "login": data.get("login"),
                    "password": data.get("password"),
                    "message": data.get("message")
                }
            else:
                print(f"❌ Ошибка в ответе: {data}")
                return {"success": False, "message": data.get("message", "Ошибка регистрации")}
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return {"success": False, "message": f"Ошибка сервера: {response.status_code}"}
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Ошибка подключения: сервер недоступен по адресу {API_URL}")
        print(f"   Проверьте, запущен ли бэкенд на порту 8081")
        return {"success": False, "message": "Сервер недоступен. Запустите бэкенд."}
    except Exception as e:
        print(f"❌ Ошибка регистрации: {e}")
        return {"success": False, "message": f"Ошибка: {str(e)}"}

def get_user_data(telegram_id: int):
    """Получение данных пользователя"""
    try:
        print(f"📤 Получение данных пользователя {telegram_id}")
        
        response = requests.get(
            f"{API_URL}/api/telegram/user-data/{telegram_id}",
            timeout=10
        )
        
        print(f"📥 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            return response.json()
        return {"success": False, "message": f"Ошибка получения данных: {response.status_code}"}
    except Exception as e:
        print(f"❌ Ошибка получения данных: {e}")
        return {"success": False, "message": "Сервер недоступен"}

def get_child_data(telegram_id: int):
    """Получение данных детей"""
    try:
        response = requests.get(
            f"{API_URL}/api/telegram/child-data/{telegram_id}",
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        return {"success": False, "message": f"Ошибка получения данных: {response.status_code}"}
    except Exception as e:
        print(f"❌ Ошибка получения данных детей: {e}")
        return {"success": False, "message": "Сервер недоступен"}

@bot.message_handler(commands=['start', 'login'])
def handle_start(message):
    user = message.from_user
    
    print(f"🆕 Новый пользователь: {user.id} - {user.first_name}")
    
    # Проверяем, зарегистрирован ли пользователь
    user_data = get_user_data(user.id)
    
    if user_data.get("success") and user_data.get("user"):
        # Пользователь уже зарегистрирован
        user_info = user_data.get("user", {})
        children_count = user_data.get("children_count", 0)
        
        response = f"""
<b>👋 ДОБРО ПОЖАЛОВАТЬ, {user_info.get('first_name', user.first_name)}!</b>

<b>Ваши данные:</b>
<b>Логин:</b> <code>{user_info.get('login', 'Не найден')}</code>
<b>Монеты:</b> {user_info.get('coins', 0)} 🪙
<b>Детей в семье:</b> {children_count} 👨‍👩‍👧‍👦

<b>Используйте меню для управления:</b>
        """
        
        markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
        btn_children = types.KeyboardButton("👶 Мои дети")
        btn_add_child = types.KeyboardButton("➕ Добавить ребенка")
        btn_my_data = types.KeyboardButton("📋 Мои данные")
        btn_tasks = types.KeyboardButton("📝 Задачи")
        markup.add(btn_children, btn_add_child, btn_my_data, btn_tasks)
        
        bot.send_message(message.chat.id, response, parse_mode='HTML', reply_markup=markup)
        
    else:
        # Пользователь не зарегистрирован
        response = f"""
<b>👋 ПРИВЕТ, {user.first_name}!</b>

Добро пожаловать в <b>Пингви</b> - бот для управления семейными задачами!

Для начала работы нужно зарегистрироваться. Я создам для вас аккаунт и пришлю данные для входа в приложение.
        """
        
        markup = types.InlineKeyboardMarkup()
        btn_register = types.InlineKeyboardButton("✅ Зарегистрироваться", callback_data="register")
        markup.add(btn_register)
        
        bot.send_message(message.chat.id, response, parse_mode='HTML', reply_markup=markup)

@bot.message_handler(commands=['mydata'])
def handle_mydata(message):
    user = message.from_user
    user_data = get_user_data(user.id)
    
    if user_data.get("success") and user_data.get("user"):
        user_info = user_data["user"]
        
        response = f"""
<b>📋 ВАШИ ДАННЫЕ</b>

<b>Имя:</b> {user_info.get('first_name')}
<b>Telegram ID:</b> {user_info.get('telegram_id')}
<b>Логин:</b> <code>{user_info.get('login')}</code>
<b>Роль:</b> {user_info.get('role')}
<b>Монеты:</b> {user_info.get('coins')} 🪙
<b>Детей:</b> {user_data.get('children_count', 0)}

<b>Для входа в приложение используйте логин и пароль, которые вы получили при регистрации.</b>
        """
        
        bot.send_message(message.chat.id, response, parse_mode='HTML')
    else:
        bot.send_message(message.chat.id, "Вы еще не зарегистрированы. Используйте /start для регистрации.")

@bot.message_handler(func=lambda message: message.text == "👶 Мои дети")
def handle_my_children(message):
    user = message.from_user
    child_data = get_child_data(user.id)
    
    if child_data.get("success"):
        if child_data.get("has_children"):
            children = child_data.get("children", [])
            
            response = "<b>👶 ВАШИ ДЕТИ</b>\n\n"
            
            for i, child in enumerate(children, 1):
                response += f"<b>{i}. {child.get('name')}</b>\n"
                if child.get('age'):
                    response += f"   Возраст: {child.get('age')} лет\n"
                response += f"   Логин: <code>{child.get('login')}</code>\n"
                response += f"   Монеты: {child.get('coins', 0)} 🪙\n\n"
            
            response += "Для управления ребенком откройте приложение."
            
        else:
            response = """
<b>👶 ВАШИ ДЕТИ</b>

У вас пока нет добавленных детей.

Используйте кнопку "➕ Добавить ребенка" чтобы создать аккаунт для ребенка.
            """
        
        bot.send_message(message.chat.id, response, parse_mode='HTML')
    else:
        bot.send_message(message.chat.id, "Ошибка получения данных. Попробуйте позже.")

@bot.message_handler(func=lambda message: message.text == "➕ Добавить ребенка")
def handle_add_child(message):
    msg = bot.send_message(message.chat.id, "Введите имя ребенка:")
    bot.register_next_step_handler(msg, process_child_name)

def process_child_name(message):
    child_name = message.text.strip()
    
    if len(child_name) < 2:
        bot.send_message(message.chat.id, "Имя должно содержать минимум 2 символа. Попробуйте снова.")
        return
    
    # Сохраняем имя во временных данных
    user_data = {
        "user_id": message.from_user.id,
        "child_name": child_name,
        "step": "age"
    }
    
    msg = bot.send_message(message.chat.id, f"Отлично! Теперь укажите возраст ребенка (от 1 до 18 лет):\n\nИмя: {child_name}")
    bot.register_next_step_handler(msg, process_child_age, user_data)

def process_child_age(message, user_data):
    try:
        age = int(message.text.strip())
        
        if age < 1 or age > 18:
            bot.send_message(message.chat.id, "Возраст должен быть от 1 до 18 лет. Попробуйте снова.")
            return
        
        user_data["age"] = age
        
        bot.send_message(message.chat.id, "⏳ Создаю аккаунт для ребенка...")
        
        # ВРЕМЕННО: показываем сообщение, что функция в разработке
        response = f"""
<b>⚠️ ФУНКЦИЯ В РАЗРАБОТКЕ</b>

Создание ребенка через бота временно недоступно.

<b>Как добавить ребенка:</b>
1. Войдите в мобильное приложение "Пингви"
2. Перейдите в раздел "Моя семья"
3. Нажмите "Добавить ребенка"
4. Введите имя и возраст ребенка
5. Данные для входа придут в этот чат

Извините за неудобства! 🙏
        """
        
        bot.send_message(message.chat.id, response, parse_mode='HTML')
        
    except ValueError:
        bot.send_message(message.chat.id, "Пожалуйста, введите число от 1 до 18.")

@bot.message_handler(func=lambda message: message.text == "📋 Мои данные")
def handle_my_data_button(message):
    handle_mydata(message)

@bot.message_handler(func=lambda message: message.text == "📝 Задачи")
def handle_tasks(message):
    response = """
<b>📝 УПРАВЛЕНИЕ ЗАДАЧАМИ</b>

Для работы с задачами необходимо использовать мобильное приложение "Пингви".

В приложении вы можете:
• Создавать задачи для себя
• Назначать задачи детям
• Устанавливать награды в монетах
• Отслеживать выполнение задач
• Получать уведомления

📲 <b>Скачайте приложение и войдите используя данные, которые вы получили при регистрации.</b>
    """
    
    bot.send_message(message.chat.id, response, parse_mode='HTML')

@bot.callback_query_handler(func=lambda call: call.data == "register")
def callback_register(call):
    user = call.from_user
    
    bot.answer_callback_query(call.id, "Регистрирую...")
    
    print(f"🔐 Регистрация пользователя: {user.id} - {user.first_name}")
    
    result = register_user(user.id, user.first_name)
    
    if result.get("success"):
        login = result.get("login")
        password = result.get("password")
        
        response = f"""
<b>✅ РЕГИСТРАЦИЯ УСПЕШНА!</b>

<b>Ваши данные для входа в приложение:</b>

<b>Логин:</b>
<code>{login}</code>

<b>Пароль:</b>
<code>{password}</code>

<b>Инструкция:</b>
1. Скачайте приложение "Пингви"
2. Введите логин и пароль
3. Начните пользоваться приложением

⚠️ <b>Сохраните эти данные!</b>
        """
        
        markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
        btn_children = types.KeyboardButton("👶 Мои дети")
        btn_add_child = types.KeyboardButton("➕ Добавить ребенка")
        btn_my_data = types.KeyboardButton("📋 Мои данные")
        markup.add(btn_children, btn_add_child, btn_my_data)
        
        bot.send_message(call.message.chat.id, response, parse_mode='HTML', reply_markup=markup)
        
        # Отдельное сообщение для легкого копирования
        copy_text = f"""
📋 ДАННЫЕ ДЛЯ КОПИРОВАНИЯ:

ЛОГИН: {login}
ПАРОЛЬ: {password}

(Нажмите и удерживайте текст)
        """
        bot.send_message(call.message.chat.id, copy_text)
        
    else:
        error_message = result.get("message", "Неизвестная ошибка")
        print(f"❌ Ошибка регистрации: {error_message}")
        
        bot.send_message(
            call.message.chat.id, 
            f"❌ Ошибка регистрации: {error_message}\n\nПопробуйте позже или проверьте, запущен ли бэкенд."
        )

@bot.message_handler(commands=['help'])
def handle_help(message):
    response = """
<b>🆘 ПОМОЩЬ ПО БОТУ</b>

<b>Основные команды:</b>
/start - Начало работы, регистрация
/mydata - Показать мои данные
/help - Эта справка

<b>Кнопки меню:</b>
👶 Мои дети - Показать список детей
➕ Добавить ребенка - Добавить нового ребенка
📋 Мои данные - Показать данные аккаунта
📝 Задачи - Информация о задачах

<b>Как пользоваться:</b>
1. Зарегистрируйтесь через /start
2. Получите данные для входа
3. Скачайте приложение "Пингви"
4. Войдите в приложение
5. Добавляйте детей и создавайте задачи

<b>Поддержка:</b>
Если возникли проблемы, напишите нам.
    """
    
    bot.send_message(message.chat.id, response, parse_mode='HTML')

@bot.message_handler(func=lambda message: message.text == "🆘 Помощь")
def handle_help_button(message):
    handle_help(message)

@bot.message_handler(func=lambda message: True)
def handle_all_messages(message):
    if message.text:
        response = """
Используйте меню кнопок ниже или команды:

• /start - Начало работы
• /mydata - Мои данные
• /help - Помощь

Для управления детьми и задачами используйте мобильное приложение.
        """
        
        markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
        btn_children = types.KeyboardButton("👶 Мои дети")
        btn_add_child = types.KeyboardButton("➕ Добавить ребенка")
        btn_my_data = types.KeyboardButton("📋 Мои данные")
        btn_help = types.KeyboardButton("🆘 Помощь")
        markup.add(btn_children, btn_add_child, btn_my_data, btn_help)
        
        bot.send_message(message.chat.id, response, reply_markup=markup)

if __name__ == "__main__":
    print("=" * 60)
    print("🤖 TELEGRAM БОТ ДЛЯ ПИНГВИ СЕМЬЯ")
    print("=" * 60)
    print(f"🔑 Токен бота: {TOKEN[:10]}...")
    print(f"🌐 API URL: {API_URL}")
    print("-" * 60)
    
    # Проверяем доступность бэкенда
    try:
        print("🔄 Проверка доступности бэкенда...")
        test_response = requests.get(f"{API_URL}/api/health", timeout=5)
        if test_response.status_code == 200:
            print("✅ Бэкенд доступен!")
        else:
            print(f"⚠️ Бэкенд ответил с кодом {test_response.status_code}")
    except Exception as e:
        print(f"❌ Бэкенд НЕ доступен: {e}")
        print(f"   Убедитесь, что бэкенд запущен на {API_URL}")
        print(f"   Запустите бэкенд: python main.py")
        print("-" * 60)
    
    try:
        bot_info = bot.get_me()
        print(f"🤖 Бот: {bot_info.first_name} (@{bot_info.username})")
        print(f"🔗 Ссылка: https://t.me/{bot_info.username}")
    except Exception as e:
        print(f"❌ Ошибка подключения к Telegram: {e}")
        print(f"   Проверьте токен бота")
        exit(1)
    
    print("\n📋 Основные функции:")
    print("  ✅ Регистрация пользователей")
    print("  ✅ Выдача данных для входа")
    print("  ✅ Просмотр детей")
    print("  ⚠️  Добавление ребенка (временно через приложение)")
    print("\n" + "=" * 60)
    print("🚀 Бот запущен и готов к работе!")
    print("=" * 60)
    
    bot.polling(none_stop=True)