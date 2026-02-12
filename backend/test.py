from fastapi import FastAPI
from pydantic import BaseModel

print("FastAPI imported successfully")
print("Pydantic imported successfully")

app = FastAPI()

class TestModel(BaseModel):
    name: str
    age: int

print("Models created successfully")
print("Все работает!")