import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        # База данных
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pingvi.db")
        
        # API
        self.API_HOST = os.getenv("API_HOST", "0.0.0.0")
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
        
        # CORS
        self.CORS_ORIGINS = ["*"]
        
        # Cloudflare Tunnel
        self.CLOUDFLARE_TUNNEL_ENABLED = os.getenv("CLOUDFLARE_TUNNEL_ENABLED", "True").lower() == "true"
        self.CLOUDFLARE_TUNNEL_PORT = int(os.getenv("CLOUDFLARE_TUNNEL_PORT", "8080"))
        
        # Настройки монет
        self.STARTING_COINS = int(os.getenv("STARTING_COINS", "5000"))
        self.TASK_COMPLETE_COINS = 100

settings = Settings()

# Создаем .env файл если его нет
if not os.path.exists(".env"):
    with open(".env", "w", encoding="utf-8") as f:
        f.write(f"""# Pingvi Family Backend Configuration
DATABASE_URL=sqlite:///./pingvi.db
API_HOST={settings.API_HOST}
API_PORT={settings.API_PORT}
API_DEBUG={settings.API_DEBUG}
API_RELOAD={settings.API_RELOAD}
SECRET_KEY={settings.SECRET_KEY}
TELEGRAM_BOT_TOKEN={settings.TELEGRAM_BOT_TOKEN}
STARTING_COINS={settings.STARTING_COINS}
CLOUDFLARE_TUNNEL_ENABLED={settings.CLOUDFLARE_TUNNEL_ENABLED}
CLOUDFLARE_TUNNEL_PORT={settings.CLOUDFLARE_TUNNEL_PORT}
""")
    print("✅ Создан файл .env с настройками по умолчанию")