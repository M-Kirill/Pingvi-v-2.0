import psycopg2
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")


def db_connection():
    con = None
    try:
        con = psycopg2.connect(
            dbname = DB_NAME,
            user = DB_USER,
            password = DB_PASSWORD,
            host = DB_HOST,
            port = DB_PORT)
        return con
    except psycopg2.Error as e:
        logging.error(f"Ошибка при подключении: {e}")
        return con


def close_connection(con):
    if con is not None:
        con.close()


def create_tables():
    con = db_connection()
    if con is None:
        logging.error("ошибка при подключении")
        return
    try:
        with con.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id SERIAL PRIMARY KEY,
                    telegram_id VARCHAR(50),
                    login VARCHAR(50),
                    password VARCHAR(255),
                    username VARCHAR(50),
                    role VARCHAR(50),
                    age INT,
                    family_id INT,
                    coins INT DEFAULT 0
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS families (
                    family_id SERIAL PRIMARY KEY,
                    created_by INT,
                    member_count INT
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS invites (
                    invite_id SERIAL PRIMARY KEY,
                    family_id INT REFERENCES families(family_id),
                    user_id INT REFERENCES users(user_id),
                    is_active BOOLEAN DEFAULT TRUE
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id SERIAL PRIMARY KEY,
                    title VARCHAR(255),
                    description TEXT,
                    coin_value INT,
                    status VARCHAR(50),
                    created_by INT REFERENCES users(user_id),
                    given_to INT REFERENCES users(user_id),
                    completed_by INT REFERENCES users(user_id),
                    completed_at TIMESTAMP
                );
            """)
        con.commit()
    except Exception as e:
        logging.error(f"Ошибка при создании таблиц: {e}")
    finally:
        if con:
            con.close()

if __name__=="__main__":
    create_tables()

