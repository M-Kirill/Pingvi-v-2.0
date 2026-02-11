from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# ВАЖНО: CORS для мобильного приложения
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить все источники
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы
    allow_headers=["*"],  # Разрешить все заголовки
)

@app.get("/")
async def root():
    return {"message": "✅ Бэкенд работает!", "api": "pingvi"}

@app.get("/api/test")
async def test():
    return {"status": "success", "data": "Тестовые данные из бэкенда"}

@app.get("/api/users")
async def get_users():
    return {"users": ["user1", "user2", "user3"]}

if __name__ == "__main__":
    print("🚀 Запуск бэкенда на http://localhost:8000")
    print("📱 Для эмулятора Android используйте: http://10.0.2.2:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)