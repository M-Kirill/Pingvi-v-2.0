import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pingvi.db")
        self.API_HOST = os.getenv("API_HOST", "0.0.0.0")
        self.API_PORT = int(os.getenv("API_PORT", "8080"))
        self.SECRET_KEY = os.getenv("SECRET_KEY", "pingvi-super-secret-key")
        self.TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8435081779:AAEd-5lTccA2DtsCQQmXZRSZDNDm3l48Has")
        self.TELEGRAM_BOT_URL = f"https://api.telegram.org/bot{self.TELEGRAM_BOT_TOKEN}"
        self.CORS_ORIGINS = ["*"]
        self.STARTING_COINS = 5000
        self.CLOUDFLARE_TUNNEL_ENABLED = False

settings = Settings()