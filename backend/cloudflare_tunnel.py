import subprocess
import os
import sys
import threading
import time
import re
from datetime import datetime
from typing import Optional

class CloudflareTunnel:
    def __init__(self, port: int = 8080):
        self.port = port
        self.process = None
        self.is_running = False
        self.public_url = None
        self.log_file = open("logs/cloudflared.log", "a")
        self.url_pattern = re.compile(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
    
    def start(self) -> Optional[str]:
        """Запуск Cloudflare Tunnel"""
        try:
            # Проверяем наличие cloudflared
            cloudflared_path = self._get_cloudflared_path()
            if not cloudflared_path:
                print("❌ cloudflared не найден")
                return None
            
            # Команда для запуска
            cmd = [cloudflared_path, "tunnel", "--url", f"http://localhost:{self.port}", "--no-autoupdate"]
            
            # Запускаем процесс
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Запускаем поток для чтения вывода
            thread = threading.Thread(target=self._read_output, daemon=True)
            thread.start()
            
            # Ждем получения URL
            timeout = 30
            start_time = time.time()
            
            while not self.public_url and (time.time() - start_time) < timeout:
                time.sleep(0.5)
            
            if self.public_url:
                self.is_running = True
                print(f"✅ Cloudflare Tunnel запущен: {self.public_url}")
                return self.public_url
            else:
                print("❌ Таймаут получения URL от Cloudflare")
                self.stop()
                return None
                
        except Exception as e:
            print(f"❌ Ошибка запуска Cloudflare Tunnel: {e}")
            return None
    
    def _get_cloudflared_path(self) -> Optional[str]:
        """Поиск cloudflared в системе"""
        # Проверяем в текущей директории
        if os.path.exists("cloudflared.exe"):
            return "cloudflared.exe"
        
        if os.path.exists("./cloudflared"):
            return "./cloudflared"
        
        # Проверяем в PATH
        import shutil
        cloudflared = shutil.which("cloudflared")
        if cloudflared:
            return cloudflared
        
        # Если не нашли, пробуем скачать
        return self._download_cloudflared()
    
    def _download_cloudflared(self) -> Optional[str]:
        """Скачивание cloudflared"""
        import urllib.request
        import platform
        
        system = platform.system().lower()
        arch = platform.machine().lower()
        
        if system == "windows":
            url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
            filename = "cloudflared.exe"
        elif system == "linux":
            if "arm" in arch:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
            else:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
            filename = "cloudflared"
        elif system == "darwin":
            url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64"
            filename = "cloudflared"
        else:
            return None
        
        try:
            print(f"📥 Скачивание cloudflared...")
            urllib.request.urlretrieve(url, filename)
            
            # Делаем исполняемым на Unix
            if system != "windows":
                os.chmod(filename, 0o755)
            
            return filename
        except Exception as e:
            print(f"❌ Ошибка скачивания cloudflared: {e}")
            return None
    
    def _read_output(self):
        """Чтение вывода процесса"""
        if not self.process:
            return
        
        for line in iter(self.process.stdout.readline, ''):
            # Записываем в лог
            self.log_file.write(f"[{datetime.now().isoformat()}] {line}")
            self.log_file.flush()
            
            # Ищем URL
            if "trycloudflare.com" in line:
                match = self.url_pattern.search(line)
                if match:
                    self.public_url = match.group(0)
                    print(f"🔗 Cloudflare URL найден: {self.public_url}")
            
            # Ищем ошибки
            if "error" in line.lower():
                print(f"⚠️ Cloudflare: {line.strip()}")
    
    def stop(self):
        """Остановка туннеля"""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=10)
            except:
                self.process.kill()
            
            self.process = None
            self.is_running = False
            print("🛑 Cloudflare Tunnel остановлен")
        
        self.log_file.close()

# Синглтон
cloudflare_tunnel = CloudflareTunnel()