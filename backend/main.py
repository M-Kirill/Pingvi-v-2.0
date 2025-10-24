# -*- coding: utf-8 -*-
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import db_connection, close_connection
import logging

logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = FastAPI()
class UserCreate(BaseModel):
    telegram_id: str
    login: str
    password: str
    username: str
    role: str
    age: int


class TaskCreate(BaseModel):
    title: str
    description: str
    coins_value: int
    created_by: int
    given_to: Optional[int] = None
    family_id: Optional[int] = None


class LoginData(BaseModel):
    login: str
    password: str


class FamilyCreate(BaseModel):
    created_by: int
    member_count: int


class InviteCreate(BaseModel):
    family_id: int
    user_id: int


@app.post("/register")
def register_user(user: UserCreate):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")
        return

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (telegram_id, login, password, username, role, age, coins)
                VALUES (%s, %s, %s, %s, %s, %s, 0) RETURNING user_id
            """, (user.telegram_id, user.login, user.password, user.username, user.role, user.age))
            user_id = cur.fetchone()[0]
            conn.commit()
            return {"user_id": user_id, "message": "User created"}
    except Exception as e:
        logging.error(f"Ошибка при добавлении юзера: {e}")
    finally:
        close_connection(conn)


@app.post("/login")
def check_login(login_data: LoginData):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, username, role, coins, family_id FROM users 
                WHERE login = %s AND password = %s
            """, (login_data.login, login_data.password))
            user = cur.fetchone()
            if user:
                return {
                    "user_id": user[0],
                    "username": user[1],
                    "role": user[2],
                    "coins": user[3],
                    "family_id": user[4],
                    "status": "success"
                }
            else:
                return {
                    "status": "error",
                    "message": "User not found or wrong password"
                }
    finally:
        close_connection(conn)


@app.post("/tasks")
def create_task(task: TaskCreate):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO tasks (title, description, coins_value, status, created_by, given_to, family_id)
                VALUES (%s, %s, %s, 'pending', %s, %s, %s) RETURNING task_id
            """, (task.title, task.description, task.coins_value, task.created_by, task.given_to, task.family_id))
            task_id = cur.fetchone()[0]
            conn.commit()
            return {"task_id": task_id, "message": "Task created"}
    except Exception as e:
        logging.error(f"Ошибка create task: {e}")
    finally:
        close_connection(conn)


@app.post("/complete_task/{task_id}")
def complete_task(task_id: int, completed_by: int):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT coins_value, given_to FROM tasks 
                WHERE task_id = %s AND status = 'pending'
            """, (task_id,))
            task = cur.fetchone()

            if not task:
                raise HTTPException(status_code=404, detail="Task not found or already completed")

            coins_value, given_to = task

            if given_to and given_to != completed_by:
                raise HTTPException(status_code=403, detail="This task is assigned to another user")

            cur.execute("""
                UPDATE tasks 
                SET status = 'completed', completed_by = %s, completed_at = NOW()
                WHERE task_id = %s
            """, (completed_by, task_id))

            cur.execute("""
                UPDATE users 
                SET coins = coins + %s 
                WHERE user_id = %s
            """, (coins_value, completed_by))

            conn.commit()
            return {"message": "Task completed", "coins_earned": coins_value}
    except Exception as e:
        logging.error(f"Ошибка статус задачи: {e}")
    finally:
        close_connection(conn)


@app.get("/users/{user_id}")
def get_user(user_id: int):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, telegram_id, username, role, age, coins, family_id 
                FROM users WHERE user_id = %s
            """, (user_id,))
            user = cur.fetchone()
            if user:
                return {
                    "user_id": user[0],
                    "telegram_id": user[1],
                    "username": user[2],
                    "role": user[3],
                    "age": user[4],
                    "coins": user[5],
                    "family_id": user[6]
                }
            else:
                return {
                    "status": "error",
                    "message": "User not found"
                }
    finally:
        close_connection(conn)


@app.post("/create_family")
def create_family(family: FamilyCreate):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO families (created_by, member_count)
                VALUES (%s, 1) RETURNING family_id
            """, (family.created_by,))
            family_id = cur.fetchone()[0]

            cur.execute("""
                UPDATE users SET family_id = %s WHERE user_id = %s
            """, (family_id, family.created_by))

            conn.commit()
            return {"family_id": family_id, "message": "Family created"}
    except Exception as e:
        logging.error(f"ошибка{e}")
    finally:
        close_connection(conn)


@app.post("/create_invite")
def create_invite(invite: InviteCreate):
    conn = db_connection()
    if conn is None:
        logging.error("ошибка при подключении")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO invites (family_id, user_id, is_used)
                VALUES (%s, %s, FALSE) RETURNING invite_id
            """, (invite.family_id, invite.user_id))
            invite_id = cur.fetchone()[0]

            conn.commit()
            return {"invite_id": invite_id, "message": "Invite created"}
    except Exception as e:
        logging.error(f"Ошибка статус задачи: {e}")
    finally:
        close_connection(conn)



@app.get("/")
def root():
    return {"message": " API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)