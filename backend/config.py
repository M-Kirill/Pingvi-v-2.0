import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        # База данных
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pingvi.db")
        
        # API - ВАЖНО: host должен быть 0.0.0.0
        self.API_HOST = os.getenv("API_HOST", "0.0.0.0")  # ИСПРАВЛЕНО
        self.API_PORT = int(os.getenv("API_PORT", "8080"))
        self.API_DEBUG = os.getenv("API_DEBUG", "True").lower() == "true"
        self.API_RELOAD = os.getenv("API_RELOAD", "True").lower() == "true"
        
        # JWT
        self.SECRET_KEY = os.getenv("SECRET_KEY", "pingvi-super-secret-key-change-in-production")
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        self.REFRESH_TOKEN_EXPIRE_DAYS = 30
        
        # Telegram
        self.TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8435081779:AAEd-5lTccA2DtsCQQmXZRSZDNDm3l48Has")
        self.TELEGRAM_BOT_URL = f"https://api.telegram.org/bot{self.TELEGRAM_BOT_TOKEN}"
        
        # CORS - разрешаем все для разработки
        self.CORS_ORIGINS = ["*"]  # ВАЖНО
        
        # Cloudflare Tunnel - ОТКЛЮЧАЕМ
        self.CLOUDFLARE_TUNNEL_ENABLED = False  # ИСПРАВЛЕНО
        self.CLOUDFLARE_TUNNEL_PORT = int(os.getenv("CLOUDFLARE_TUNNEL_PORT", "8080"))
        
        # Настройки монет
        self.STARTING_COINS = int(os.getenv("STARTING_COINS", "0"))
        self.TASK_COMPLETE_COINS = 100

settings = Settings()