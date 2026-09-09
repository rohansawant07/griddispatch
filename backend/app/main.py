import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import router
from app.services.optimizer import OptimizationError

app = FastAPI(
    title="GridDispatch",
    version="1.0.0",
    description="Independent prototype. Synthetic demo data. No live asset execution.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(ValueError)
async def invalid_input(request: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(OptimizationError)
async def failed_optimization(request: Request, exc: OptimizationError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


app.include_router(router)
