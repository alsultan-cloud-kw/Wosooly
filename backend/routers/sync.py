# crm_backend/routers/sync.py
import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
# from utils.fetch_orders import fetch_and_save_orders
# from tasks.fetch_orders import fetch_and_save_orders
# from tasks.fetch_products import fetch_and_save_products
from dotenv import load_dotenv
from models import WhatsAppTemplate, WhatsAppCredentials, Client
from datetime import datetime
from typing import List
from schemas import WhatsAppTemplateBase
from utils.auth import get_current_client

router = APIRouter()

load_dotenv()

# ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
# WABA_ID = os.getenv("WABA_ID")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# @router.post("/sync-orders/")
# def trigger_sync_all():
#     fetch_and_save_orders()
#     return {"message": "Order sync task dispatched"}

# @router.post("/sync-products/")
# def trigger_sync_all():
#     fetch_and_save_products()
#     return {"message": "Product sync task dispatched"}

@router.post("/sync-templates")
def sync_templates(
    current_client: Client = Depends(get_current_client),  # the actual Client object
    db: Session = Depends(get_db)
):
    # Fetch WhatsApp credentials for this client
    creds = db.query(WhatsAppCredentials).filter_by(client_id=current_client.id).first()
    if not creds:
        raise HTTPException(status_code=404, detail="WhatsApp credentials not found for client")

    ACCESS_TOKEN = creds.access_token
    WABA_ID = creds.waba_id

    url = f"https://graph.facebook.com/v20.0/{WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return {"error": response.json()}

    templates = response.json().get("data", [])

    for t in templates:
        body_component = next((c for c in t.get("components", []) if c["type"] == "BODY"), {})

        existing = (
            db.query(WhatsAppTemplate)
            .filter_by(template_name=t["name"], client_id=current_client.id)
            .first()
        )

        if existing:
            existing.category = t["category"]
            existing.language = t["language"]
            existing.status = t["status"]
            existing.body = body_component.get("text")
            existing.updated_at = datetime.utcnow()
        else:
            new_template = WhatsAppTemplate(
                client_id=current_client.id,
                template_name=t["name"],
                category=t["category"],
                language=t["language"],
                status=t["status"],
                body=body_component.get("text"),
                updated_at=datetime.utcnow()
            )
            db.add(new_template)

    db.commit()
    return {"message": f"✅ Synced {len(templates)} templates for client {current_client.id}"}

@router.get("/templates/", response_model=List[WhatsAppTemplateBase])
def get_templates(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)
    ):
    templates = (
        db.query(WhatsAppTemplate)
        .filter_by(client_id=current_client.id)
        .all()
    )
    return templates