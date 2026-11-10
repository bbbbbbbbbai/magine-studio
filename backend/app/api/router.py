from fastapi import APIRouter

from app.api.routes import config, generations, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(config.router)
api_router.include_router(generations.router)
