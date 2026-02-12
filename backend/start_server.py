#!/usr/bin/env python3
"""
Скрипт для запуска бэкенда с ngrok
"""

import subprocess
import sys
import os
import time
import webbrowser

def check_ngrok():
    """Проверка установки ngrok"""
    try:
        result = subprocess.run(['ngrok', '--version'], 
                              capture_output=True, 
                              text=True)
        if result.returncode == 0:
            print("✅ Ngrok установлен")
            return True
    except:
        pass
    
    print("❌ Ngrok не установлен!")
    print("\n📥 Установите ngrok:")
    print("1. Зарегистрируйтесь на https://ngrok.com")
    print("2. Скачайте и установите ngrok")
    print("3. Авторизуйте: ngrok config add-authtoken YOUR_TOKEN")
    print("\nИли используйте без ngrok:")
    print("python main.py")
    
    response = input("\nУстановить ngrok сейчас? (y/n): ")
    if response.lower() == 'y':
        install_ngrok()
    return False

def install_ngrok():
    """Установка ngrok"""
    print("\n📥 Скачиваю ngrok...")
    
    # Для macOS
    if sys.platform == 'darwin':
        subprocess.run(['brew', 'install', 'ngrok'], check=True)
    
    # Для Linux
    elif sys.platform == 'linux':
        subprocess.run(['snap', 'install', 'ngrok'], check=True)
    
    # Для Windows - предложить скачать
    elif sys.platform == 'win32':
        print("Пожалуйста, скачайте ngrok с https://ngrok.com/download")
        webbrowser.open('https://ngrok.com/download')
    
    print("\n🔑 Теперь зарегистрируйтесь на https://ngrok.com")
    print("и выполните: ngrok config add-authtoken YOUR_TOKEN")

def main():
    """Основная функция запуска"""
    print("=" * 60)
    print("🚀 ЗАПУСК PINGVI FAMILY BACKEND")
    print("=" * 60)
    
    # Проверяем зависимости
    print("\n🔍 Проверка зависимостей...")
    
    # Проверяем Python
    if sys.version_info < (3, 8):
        print("❌ Требуется Python 3.8 или выше")
        return
    
    # Проверяем ngrok
    use_ngrok = check_ngrok()
    
    print("\n⚙️  Настройки запуска:")
    print(f"   • Использовать ngrok: {'Да' if use_ngrok else 'Нет'}")
    print("   • Порт: 8000")
    print("   • Хост: 0.0.0.0")
    
    # Запускаем бэкенд
    print("\n🚀 Запускаю бэкенд...")
    
    # Определяем команду запуска
    if use_ngrok:
        # Запускаем через main.py (ngrok запустится автоматически)
        cmd = [sys.executable, 'main.py']
    else:
        # Просто запускаем бэкенд
        cmd = [sys.executable, 'main.py']
    
    try:
        process = subprocess.Popen(cmd)
        print("\n✅ Бэкенд запущен!")
        print("\n🌐 Доступные адреса:")
        print("   • Документация: http://localhost:8000/docs")
        print("   • JSON API: http://localhost:8000/redoc")
        print("   • Health check: http://localhost:8000/api/health")
        
        if use_ngrok:
            print("\n⏳ Ожидайте URL ngrok (появится через 5-10 секунд)...")
            print("   (проверьте консоль бэкенда)")
        
        print("\n🛑 Для остановки нажмите Ctrl+C")
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Остановка...")
        if process:
            process.terminate()
    except Exception as e:
        print(f"❌ Ошибка запуска: {e}")

if __name__ == "__main__":
    main()