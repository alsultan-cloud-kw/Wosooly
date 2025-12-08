import os
import re
import asyncio
import requests
from fastapi import APIRouter,FastAPI, Depends, HTTPException, status, Form, WebSocket
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session
from schemas import WhatsAppCredentialsInput, SendMessageRequest
from utils.auth import get_current_client
from database import get_db
from http.client import HTTPException
from fastapi import Request, APIRouter, Query, Depends
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from models import WhatsAppMessage, Customer, WhatsAppTemplate, WhatsAppCredentials, Client
from datetime import datetime
from typing import List, Optional
from tasks.send_whatsapp import send_whatsapp_template_message
from tasks.reorder_messaging import format_kuwait_number
from utils.subscription import require_feature

active_connections = []

load_dotenv()

router = APIRouter()

# 📩 Payload model for sending message
# class WhatsAppMessageRequest(BaseModel):
#     to_number: str  # e.g. 201234567890 (no +)
#     message: str

def normalize_number(number: str) -> str:
    """Remove + and leading zeros for consistent comparison."""
    return number.lstrip("+").lstrip("0")

@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    print("📩 [WEBHOOK RECEIVED] Raw payload:", data)

    value = data.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {})
    messages = value.get("messages", [])
    statuses = value.get("statuses", [])

    # ✅ Handle incoming messages
    if messages:
        msg = messages[0]
        from_number = normalize_number(msg.get("from", ""))
        body = msg.get("text", {}).get("body", "")
        timestamp = msg.get("timestamp", None)
        wa_msg_id = msg.get("id")

        print(f"📨 [MESSAGE RECEIVED] from={from_number} text={body} id={wa_msg_id}")

        if timestamp:
            timestamp = datetime.fromtimestamp(int(timestamp))

        # Lookup customer
        customers = db.query(Customer).all()
        matched_customer = None
        for c in customers:
            if normalize_number(c.phone).endswith(from_number[-8:]):
                matched_customer = c
                break

        if matched_customer:
            print(f"✅ [CUSTOMER MATCHED] id={matched_customer.id} phone={matched_customer.phone}")
            db_msg = WhatsAppMessage(
                customer_id=matched_customer.id,
                direction="incoming",
                message=body,
                timestamp=timestamp or datetime.utcnow(),
                whatsapp_message_id=wa_msg_id,
                status=None,
            )
            db.add(db_msg)
            db.commit()
            print("💾 [DB SAVED] Incoming message stored")
        else:
            print("⚠️ [NO CUSTOMER MATCH] Could not match number:", from_number)

    # ✅ Handle message status updates
    if statuses:
        status_event = statuses[0]
        wa_msg_id = status_event.get("id")
        status_type = status_event.get("status")
        timestamp = status_event.get("timestamp")

        print(f"🔔 [STATUS UPDATE] id={wa_msg_id} status={status_type}")

        if timestamp:
            timestamp = datetime.fromtimestamp(int(timestamp))

        db_msg = db.query(WhatsAppMessage).filter(
            WhatsAppMessage.whatsapp_message_id == wa_msg_id
        ).first()

        if db_msg:
            db_msg.status = status_type
            db_msg.timestamp = timestamp or db_msg.timestamp
            db.commit()
            print("💾 [DB UPDATED] Status updated")
        else:
            print("⚠️ [STATUS UPDATE FAILED] No matching message found")

    # ✅ Broadcast to WebSocket clients
    disconnected = []
    for conn in active_connections:
        try:
            await conn.send_json(data)
            print("📡 [WS SENT] Payload pushed to client")
        except Exception as e:
            print("❌ [WS ERROR] Failed to send:", e)
            disconnected.append(conn)

    for conn in disconnected:
        active_connections.remove(conn)

    return {"status": "received"}

@router.post("/whatsapp/save-credentials")
def save_credentials(
    data: WhatsAppCredentialsInput,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)  # however you auth
):
    creds = db.query(WhatsAppCredentials).filter(
        WhatsAppCredentials.client_id == current_client.id
    ).first()

    if creds:
        # update
        creds.phone_number_id = data.phoneNumberId
        creds.waba_id = data.wabaId
        creds.access_token = data.accessToken
    else:
        creds = WhatsAppCredentials(
            client_id=current_client.id,
            phone_number_id=data.phoneNumberId,
            waba_id=data.wabaId,
            access_token=data.accessToken,
        )
        db.add(creds)

    db.commit()
    db.refresh(creds)

    return {"status": "success"}

def get_whatsapp_config(db: Session, client_id: int):
    creds = db.query(WhatsAppCredentials).filter(
        WhatsAppCredentials.client_id == client_id
    ).first()

    if not creds:
        raise HTTPException(status_code=400, detail="WhatsApp API credentials not configured")

    return {
        "access_token": creds.access_token,
        "phone_number_id": creds.phone_number_id,
        "api_url": f"https://graph.facebook.com/v18.0/{creds.phone_number_id}/messages"
    }

def send_whatsapp_message(db: Session, client_id: int, to_number: str, message: str):

    cfg = get_whatsapp_config(db, client_id)

    url = cfg["api_url"]

    headers = {
        "Authorization": f"Bearer {cfg['access_token']}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": message}
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()

def build_message_from_template(
    db: Session,
    client_id: int,
    template_name: str,
    variables: Optional[List[str]] = None
) -> str:
    """
    Fetch a template for the given client and populate variables.
    Template body can contain placeholders {0}, {1}, {2}, etc.
    """
    template = (
        db.query(WhatsAppTemplate)
        .filter(
            WhatsAppTemplate.client_id == client_id,
            WhatsAppTemplate.template_name == template_name
        )
        .first()
    )

    if not template:
        raise ValueError(f"Template '{template_name}' not found for client {client_id}")

    body = template.body or ""

    if not variables:
        return body

    try:
        return body.format(*variables)
    except Exception:
        # fallback if placeholders do not match variables
        return body

# 🔗 New endpoint: Send message via API
@router.post("/send-message")
def send_message(
    data: SendMessageRequest,
    db: Session = Depends(get_db),
    # current_client: Client = Depends(get_current_client),
    current_client: Client = Depends(require_feature("nl2sql")),
    
):
    try:
        print("data@@@@@@@", data)

        template_name = data.templates[0]

        results = []

        for customer_id in data.customers:
            customer = db.query(Customer).filter(
                Customer.id == customer_id,
                Customer.client_id == current_client.id
            ).first()
            if not customer:
                continue

            phone = customer.phone
            customer_vars = None
            if data.variables and customer_id in data.variables:
                customer_vars = data.variables[customer_id]

            template_name = data.templates[0]  # <-- make sure you set this

            message = build_message_from_template(
                db=db,
                client_id=current_client.id,
                template_name=template_name,  # <-- was missing
                variables=customer_vars
            )

            # Send message
            result = send_whatsapp_message(
                db=db,
                client_id=current_client.id,
                to_number=phone,
                message=message
            )

            # Save to DB
            db_msg = WhatsAppMessage(
                customer_id=customer.id,
                client_id=current_client.id,
                direction="outgoing",
                message=message,
                timestamp=datetime.utcnow(),
                status="sent"
            )
            db.add(db_msg)

            results.append({
                "customer_id": customer_id,
                "phone": phone,
                "result": result
            })

        db.commit()
        return results

    except Exception as e:
        print("ERROR:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})

def fill_template(body: str, values: list[str] | None = None) -> str:
    """
    Replace numbered placeholders {{1}}, {{2}}, ... with provided values.
    """
    message = body
    if values:
        for idx, val in enumerate(values, start=1):
            message = re.sub(rf"{{{{{idx}}}}}", str(val), message)
    return message

# @router.post("/send-message-to-each-customer")
# def send_message(data: SendMessageRequest):
#     if not data.customers:
#         raise HTTPException(status_code=400, detail="No customers selected")
#     if not data.templates:
#         raise HTTPException(status_code=400, detail="No templates selected")

#     target_customers = [c for c in CUSTOMERS_DB if c["id"] in data.customers]
#     if not target_customers:
#         raise HTTPException(status_code=404, detail="No valid customers found")

#     messages = []
#     for customer in target_customers:
#         for template in data.templates:
#             values = data.variables.get(customer["id"], []) if data.variables else []
#             filled = fill_template(template.body, values)
#             msg = {
#                 "to": customer["phone"],
#                 "name": customer["name"],
#                 "template": template.template_name,
#                 "message": filled,
#             }
#             messages.append(msg)

#             # 👉 Replace this with actual send logic (Twilio, WhatsApp API, etc.)
#             print(f"Sending to {customer['phone']}: {filled}")

#     return {
#         "status": "success",
#         "sent": len(messages),
#         "messages": messages,
#     }

@router.get("/whatsapp/has-credentials")
def has_whatsapp_credentials(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    creds = (
        db.query(WhatsAppCredentials)
        .filter_by(client_id=current_client.id)
        .first()
    )

    return {"hasCredentials": creds is not None}
