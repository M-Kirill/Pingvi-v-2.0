import socket
import netifaces
from typing import List, Optional

def get_local_ips() -> List[str]:
    """Получение всех локальных IP адресов"""
    ips = ['127.0.0.1']
    
    try:
        # Пробуем получить IP через стандартный метод
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except:
        pass
    
    # Пробуем получить все IP через netifaces
    try:
        for interface in netifaces.interfaces():
            addrs = netifaces.ifaddresses(interface)
            if netifaces.AF_INET in addrs:
                for addr in addrs[netifaces.AF_INET]:
                    ip = addr['addr']
                    if ip not in ips and not ip.startswith('127.'):
                        ips.append(ip)
    except:
        pass
    
    return ips

def get_available_urls(port: int = 8080) -> List[str]:
    """Получение всех доступных URL для подключения"""
    urls = [f"http://localhost:{port}"]
    
    for ip in get_local_ips():
        if ip != '127.0.0.1':
            urls.append(f"http://{ip}:{port}")
    
    return urls