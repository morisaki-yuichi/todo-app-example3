from fastapi import FastAPI

from app.routers import auth, todos

app = FastAPI(title="TODO API")

app.include_router(auth.router)
app.include_router(todos.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
