# cloudflare_tunnel.py
"""
Модуль для управления Cloudflare Tunnel
"""

import subprocess
import threading
import time
import os
import sys

class CloudflareTunnel:
    def __init__(self, port=8080):  # Изменил на 8080 по умолчанию
        self.port = port
        self.process = None
        self.public_url = None
        self.is_running = False
        self.output_thread = None
        
    def _read_output(self):
        """Чтение вывода процесса"""
        try:
            while self.process and self.process.stdout:
                line = self.process.stdout.readline()
                if line:
                    line = line.strip()
                    print(f"[Cloudflare] {line}")
                    
                    # Ищем URL в выводе
                    if "trycloudflare.com" in line:
                        # Ищем URL в строке
                        import re
                        urls = re.findall(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com', line)
                        if urls:
                            self.public_url = urls[0]
                            print(f"✅ Cloudflare Tunnel URL: {self.public_url}")
                    elif "cfargotunnel.com" in line:
                        import re
                        urls = re.findall(r'https://[a-zA-Z0-9\-]+\.cfargotunnel\.com', line)
                        if urls:
                            self.public_url = urls[0]
                            print(f"✅ Cloudflare Tunnel URL: {self.public_url}")
        except Exception as e:
            print(f"[Cloudflare] Ошибка чтения вывода: {e}")
    
    def start(self):
        """Запуск Cloudflare Tunnel"""
        try:
            print(f"🌐 Запускаю Cloudflare Tunnel на порту {self.port}...")
            
            # Проверяем наличие cloudflared
            cloudflared_paths = [
                'cloudflared.exe',
                'cloudflared',
                os.path.join(os.getcwd(), 'cloudflared.exe'),
                r'C:\Windows\System32\cloudflared.exe'
            ]
            
            cloudflared = None
            for path in cloudflared_paths:
                if os.path.exists(path):
                    cloudflared = path
                    break
            
            if not cloudflared:
                # Пробуем найти в PATH
                try:
                    result = subprocess.run(['cloudflared', '--version'], 
                                          capture_output=True, 
                                          text=True,
                                          timeout=5)
                    if result.returncode == 0:
                        cloudflared = 'cloudflared'
                        print(f"✅ Cloudflared найден в PATH")
                except:
                    pass
            
            if not cloudflared:
                print("❌ Cloudflared не найден!")
                print("📋 Скачайте cloudflared:")
                print("   https://github.com/cloudflare/cloudflared/releases")
                print("   Положите cloudflared.exe в папку с проектом")
                return None
            
            print(f"✅ Использую cloudflared: {cloudflared}")
            
            # Создаем папку для логов если нет
            os.makedirs("logs", exist_ok=True)
            
            # Запускаем процесс с логированием
            cmd = [
                cloudflared,
                'tunnel',
                '--url', f'http://localhost:{self.port}',
                '--logfile', 'logs/cloudflared.log',
                '--loglevel', 'info'
            ]
            
            print(f"🚀 Команда: {' '.join(cmd)}")
            
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NO_WINDOW  # Для Windows
            )
            
            self.is_running = True
            
            # Запускаем поток для чтения вывода
            self.output_thread = threading.Thread(target=self._read_output, daemon=True)
            self.output_thread.start()
            
            # Ждем появления URL (максимум 30 секунд)
            print("⏳ Ожидание URL от Cloudflare...")
            for i in range(30):  # 30 секунд максимум
                if self.public_url:
                    print(f"✅ URL получен за {i+1} секунд")
                    break
                time.sleep(1)
                if i % 5 == 0 and i > 0:
                    print(f"⏳ Ожидание... ({i+1} сек)")
            
            if self.public_url:
                print(f"✅ Cloudflare Tunnel запущен!")
                print(f"🔗 Публичный URL: {self.public_url}")
                
                # Читаем лог для дополнительной информации
                if os.path.exists("logs/cloudflared.log"):
                    with open("logs/cloudflared.log", "r") as f:
                        lines = f.readlines()
                        for line in lines:
                            if "Your quick Tunnel has been created" in line or "trycloudflare.com" in line:
                                print(f"📋 Из лога: {line.strip()}")
                
                return self.public_url
            else:
                print("⚠️ Не удалось получить URL от Cloudflare")
                print("📋 Проверьте файл logs/cloudflared.log")
                
                # Показываем последние строки лога
                if os.path.exists("logs/cloudflared.log"):
                    with open("logs/cloudflared.log", "r") as f:
                        lines = f.readlines()[-10:]  # Последние 10 строк
                        print("📋 Последние строки лога:")
                        for line in lines:
                            print(f"   {line.strip()}")
                
                return None
                
        except Exception as e:
            print(f"❌ Ошибка запуска Cloudflare Tunnel: {e}")
            return None
    
    def stop(self):
        """Остановка Cloudflare Tunnel"""
        if self.process:
            print("🛑 Останавливаю Cloudflare Tunnel...")
            self.is_running = False
            
            # Останавливаем процесс
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except:
                try:
                    self.process.kill()
                except:
                    pass
            
            self.process = None
            self.public_url = None
            
            print("✅ Cloudflare Tunnel остановлен")
    
    def get_status(self):
        """Получение статуса туннеля"""
        return {
            "is_running": self.is_running,
            "public_url": self.public_url,
            "port": self.port
        }

# Создаем глобальный экземпляр (порт 8080)
cloudflare_tunnel = CloudflareTunnel(port=8080)

# Экспорт функции для удобного использования
def start_tunnel(port=8080):
    """Функция для запуска туннеля"""
    if cloudflare_tunnel.is_running:
        print("ℹ️ Туннель уже запущен")
        return cloudflare_tunnel.public_url
    
    cloudflare_tunnel.port = port
    return cloudflare_tunnel.start()

def stop_tunnel():
    """Функция для остановки туннеля"""
    cloudflare_tunnel.stop()

def get_tunnel_url():
    """Получение URL туннеля"""
    return cloudflare_tunnel.public_url