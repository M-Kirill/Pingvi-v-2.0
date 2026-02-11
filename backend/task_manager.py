# task_manager.py

import sqlite3
from datetime import datetime
import json

class TaskManager:
    
    @staticmethod
    def get_user_tasks(user_id, type_filter=None, date_filter=None, status_filter=None):
        """Получение задач пользователя с фильтрами"""
        try:
            conn = sqlite3.connect('pingvi.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Базовый запрос
            query = "SELECT * FROM tasks WHERE user_id = ?"
            params = [user_id]
            
            # Добавляем фильтры
            if type_filter:
                query += " AND type = ?"
                params.append(type_filter)
            
            if date_filter:
                # Если фильтр по дате, проверяем что задача на эту дату
                if isinstance(date_filter, datetime):
                    date_str = date_filter.date().isoformat()
                else:
                    date_str = date_filter.isoformat().split('T')[0]
                query += " AND DATE(start_date) = DATE(?)"
                params.append(date_str)
            
            if status_filter:
                query += " AND status = ?"
                params.append(status_filter)
            
            query += " ORDER BY created_at DESC"
            
            print(f"Запрос: {query}")
            print(f"Параметры: {params}")
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Преобразуем в список словарей
            tasks = []
            for row in rows:
                task = dict(row)
                # Преобразуем даты из строк в datetime объекты
                for date_field in ['start_date', 'end_date', 'created_at', 'updated_at']:
                    if task.get(date_field):
                        try:
                            task[date_field] = datetime.fromisoformat(task[date_field])
                        except:
                            pass
                tasks.append(task)
            
            conn.close()
            return tasks
            
        except Exception as e:
            print(f"Ошибка получения задач: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def create_task(user_id, task_data):
        """Создание новой задачи"""
        try:
            conn = sqlite3.connect('pingvi.db')
            cursor = conn.cursor()
            
            # Подготавливаем данные
            title = task_data.get('title', '')
            description = task_data.get('description', '')
            task_type = task_data.get('type', 'personal')
            status = task_data.get('status', 'pending')
            coins = task_data.get('coins', 0)
            child_name = task_data.get('child_name', '')
            
            # Обработка дат
            start_date = task_data.get('start_date')
            if start_date and isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            
            end_date = task_data.get('end_date')
            if end_date and isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            current_time = datetime.now().isoformat()
            
            query = """
            INSERT INTO tasks 
            (user_id, title, description, type, status, coins, child_name, start_date, end_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            params = (user_id, title, description, task_type, status, coins, child_name,
                     start_date.isoformat() if start_date else None,
                     end_date.isoformat() if end_date else None,
                     current_time, current_time)
            
            cursor.execute(query, params)
            task_id = cursor.lastrowid
            
            # Получаем созданную задачу
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            
            if row:
                task = dict(zip([column[0] for column in cursor.description], row))
                # Преобразуем даты
                for date_field in ['start_date', 'end_date', 'created_at', 'updated_at']:
                    if task.get(date_field):
                        try:
                            task[date_field] = datetime.fromisoformat(task[date_field])
                        except:
                            pass
            else:
                task = None
            
            conn.commit()
            conn.close()
            
            return task
            
        except Exception as e:
            print(f"Ошибка создания задачи: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def update_task_status(task_id, user_id, status):
        """Обновление статуса задачи"""
        try:
            conn = sqlite3.connect('pingvi.db')
            cursor = conn.cursor()
            
            # Проверяем, что задача принадлежит пользователю
            cursor.execute("SELECT * FROM tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return None
            
            # Обновляем статус
            updated_at = datetime.now().isoformat()
            cursor.execute(
                "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
                (status, updated_at, task_id)
            )
            
            # Получаем обновленную задачу
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            
            task = None
            if row:
                task = dict(zip([column[0] for column in cursor.description], row))
                # Преобразуем даты
                for date_field in ['start_date', 'end_date', 'created_at', 'updated_at']:
                    if task.get(date_field):
                        try:
                            task[date_field] = datetime.fromisoformat(task[date_field])
                        except:
                            pass
            
            conn.commit()
            conn.close()
            
            return task
            
        except Exception as e:
            print(f"Ошибка обновления статуса задачи: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def delete_task(task_id, user_id):
        """Удаление задачи"""
        try:
            conn = sqlite3.connect('pingvi.db')
            cursor = conn.cursor()
            
            # Проверяем, что задача принадлежит пользователю
            cursor.execute("SELECT id FROM tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
            if not cursor.fetchone():
                conn.close()
                return False
            
            cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            conn.commit()
            conn.close()
            
            return cursor.rowcount > 0
            
        except Exception as e:
            print(f"Ошибка удаления задачи: {e}")
            import traceback
            traceback.print_exc()
            return False


class FamilyManager:
    
    @staticmethod
    def get_family_members(user_id):
        """Получение членов семьи пользователя"""
        try:
            conn = sqlite3.connect('pingvi.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM family WHERE user_id = ?", (user_id,))
            rows = cursor.fetchall()
            
            members = []
            for row in rows:
                members.append(dict(row))
            
            conn.close()
            return members
            
        except Exception as e:
            print(f"Ошибка получения членов семьи: {e}")
            return []
    
    @staticmethod
    def add_family_member(user_id, name, age=None):
        """Добавление члена семьи"""
        try:
            conn = sqlite3.connect('pingvi.db')
            cursor = conn.cursor()
            
            created_at = datetime.now().isoformat()
            
            cursor.execute(
                "INSERT INTO family (user_id, name, age, created_at) VALUES (?, ?, ?, ?)",
                (user_id, name, age, created_at)
            )
            
            member_id = cursor.lastrowid
            
            # Получаем созданного члена семьи
            cursor.execute("SELECT * FROM family WHERE id = ?", (member_id,))
            row = cursor.fetchone()
            
            if row:
                member = dict(zip([column[0] for column in cursor.description], row))
            else:
                member = None
            
            conn.commit()
            conn.close()
            
            return member
            
        except Exception as e:
            print(f"Ошибка добавления члена семьи: {e}")
            return None


class UserManagerExtended:
    
    @staticmethod
    def get_user_profile(user_id):
        """Получение полного профиля пользователя"""
        try:
            conn = sqlite3.connect('pingvi.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Получаем основную информацию о пользователе
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()
            
            if not user_row:
                conn.close()
                return None
            
            profile = dict(user_row)
            
            # Получаем задачи пользователя
            cursor.execute("SELECT COUNT(*) as task_count FROM tasks WHERE user_id = ?", (user_id,))
            task_count = cursor.fetchone()['task_count']
            
            # Получаем выполненные задачи
            cursor.execute("SELECT COUNT(*) as completed_count FROM tasks WHERE user_id = ? AND status = 'completed'", (user_id,))
            completed_count = cursor.fetchone()['completed_count']
            
            # Получаем членов семьи
            cursor.execute("SELECT COUNT(*) as family_count FROM family WHERE user_id = ?", (user_id,))
            family_count = cursor.fetchone()['family_count']
            
            # Добавляем статистику в профиль
            profile['stats'] = {
                'total_tasks': task_count,
                'completed_tasks': completed_count,
                'family_members': family_count
            }
            
            conn.close()
            return profile
            
        except Exception as e:
            print(f"Ошибка получения профиля: {e}")
            return None