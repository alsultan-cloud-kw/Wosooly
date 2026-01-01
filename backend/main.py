# main.py
import os
from fastapi import FastAPI
from routers import auth
import redis
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    orders,
    products,
    customers,
    nl2sql,
    whatsapp,
    sync,
    upload,
    dashboard_excel,
    excel_products,
    excel_customers,
    excel_orders,
    woocommerce,
    excel_chat,
    admin,
    competitor_analysis,
    send_mail,
)

load_dotenv()
app = FastAPI()

# CORS configuration
origins = [
    "https://www.wosooly.com/",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # or ["*"] if testing locally
    allow_credentials=True,
    allow_methods=["*"],              # allow all HTTP methods
    allow_headers=["*"],              # allow all headers
    expose_headers=["*"],             # expose all headers
)

# ---------------------------
# Redis client placeholder
# ---------------------------
r: redis.Redis | None = None

# ---------------------------
# Startup event
# ---------------------------
@app.on_event("startup")
def on_startup():
    global r
    # Use REDIS_URL from environment
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL environment variable is missing!")

    # Initialize Redis connection
    r = redis.from_url(redis_url, decode_responses=True)
    
    # Test Redis connection
    try:
        r.ping()
        print("✅ Connected to Redis successfully.")
    except Exception as e:
        print("❌ Failed to connect to Redis:", e)
        raise

    print("✅ FastAPI app started. Background syncing is managed by Celery + Beat.")

# ---------------------------
# Health check endpoint
# ---------------------------
@app.get("/health")
def health_check():
    try:
        r.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "fail"

    return {
        "status": "ok",
        "redis": redis_status
    }

# ---------------------------
# Root endpoint
# ---------------------------
@app.get("/")
def read_root():
    r.set("message", "Hello from Redis!")
    return {"message": r.get("message")}

# Include your routers
# app.include_router(sync.router)
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(nl2sql.router)
app.include_router(whatsapp.router)
app.include_router(sync.router)
app.include_router(upload.router)
app.include_router(woocommerce.router)
app.include_router(dashboard_excel.router)
app.include_router(excel_products.router)
app.include_router(excel_customers.router)
app.include_router(excel_orders.router)
app.include_router(excel_chat.router, prefix="/excel-chat", tags=["excel-chat"])
app.include_router(admin.router)
app.include_router(competitor_analysis.router)
app.include_router(send_mail.router)
# app.include_router(ai_chat.router)
# app.include_router(whatsapp_messaging.router)
# app.include_router(forecast_api.router)
