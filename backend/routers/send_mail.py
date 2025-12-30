from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
import cloudinary
import cloudinary.uploader
from io import BytesIO
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from schemas import EmailRequest, EmailTemplateBase, EmailTemplateCreate, EmailTemplateUpdate, SendEmailRequest
from database import get_db
from models import *  # Assuming Customer model is imported
from customers_excel.db_helper import get_customers_table_from_db
from utils.auth import get_current_client
import time
import smtplib
import socket
import re
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formataddr
from datetime import datetime

router = APIRouter()
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary for file uploads
try:
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )
except Exception as e:
    print(f"Warning: Cloudinary not configured: {e}")

# Get SMTP credentials from environment
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))  # Default to 587 (TLS)
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "")  # Optional display name
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"  # Default to True
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"  # Default to False

# Debug logging (only log if credentials are set to avoid exposing secrets)
print("SMTP_HOST:", SMTP_HOST)
print("SMTP_PORT:", SMTP_PORT)
print("SMTP_FROM_EMAIL:", SMTP_FROM_EMAIL)
print("SMTP_FROM_NAME:", SMTP_FROM_NAME)
print("SMTP_USE_TLS:", SMTP_USE_TLS)
print("SMTP_USE_SSL:", SMTP_USE_SSL)
print("SMTP_USERNAME:", "***SET***" if SMTP_USERNAME else "***NOT SET***")
print("SMTP_PASSWORD:", "***SET***" if SMTP_PASSWORD else "***NOT SET***")

# Validate SMTP configuration
if not all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL]):
    print("⚠️ SMTP credentials not fully configured. Email sending will fail.")
    print("Required environment variables:")
    print("  - SMTP_HOST (e.g., smtp.gmail.com)")
    print("  - SMTP_PORT (e.g., 587 for TLS, 465 for SSL)")
    print("  - SMTP_USERNAME (your email address)")
    print("  - SMTP_PASSWORD (your email password or app password)")
    print("  - SMTP_FROM_EMAIL (sender email address)")
    print("Optional environment variables:")
    print("  - SMTP_FROM_NAME (display name for sender)")
    print("  - SMTP_USE_TLS (true/false, default: true)")
    print("  - SMTP_USE_SSL (true/false, default: false)")
else:
    print("✅ SMTP configuration loaded successfully")

def send_single_email(to_email: str, subject: str, html_body: str, attachments: Optional[List[str]] = None):
    """
    Send a single email using SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: Email body in HTML format
    
    Returns:
        str: Message ID or success indicator
    """
    # Validate SMTP configuration
    if not all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL]):
        raise ValueError(
            "SMTP is not configured. Please set the following environment variables:\n"
            "- SMTP_HOST (e.g., smtp.gmail.com)\n"
            "- SMTP_PORT (e.g., 587 for TLS, 465 for SSL)\n"
            "- SMTP_USERNAME (your email address)\n"
            "- SMTP_PASSWORD (your email password or app password)\n"
            "- SMTP_FROM_EMAIL (sender email address)\n"
            "Optional:\n"
            "- SMTP_FROM_NAME (display name)\n"
            "- SMTP_USE_TLS (true/false, default: true)\n"
            "- SMTP_USE_SSL (true/false, default: false)"
        )
    
    # Create message
    msg = MIMEMultipart("alternative")
    
    # Set sender (with optional display name)
    if SMTP_FROM_NAME:
        msg["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
    else:
        msg["From"] = SMTP_FROM_EMAIL
    
    msg["To"] = to_email
    msg["Subject"] = subject
    
    # Attach HTML body
    html_part = MIMEText(html_body, "html", "utf-8")
    msg.attach(html_part)
    
    # Attach files if provided
    if attachments:
        for attachment_url in attachments:
            try:
                # Download file from URL
                response = requests.get(attachment_url, timeout=30)
                if response.status_code == 200:
                    # Extract filename from URL
                    filename = attachment_url.split('/')[-1]
                    if '?' in filename:
                        filename = filename.split('?')[0]
                    
                    # Determine content type
                    content_type = response.headers.get('Content-Type', 'application/octet-stream')
                    
                    # Create attachment
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(response.content)
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {filename}'
                    )
                    msg.attach(part)
            except Exception as e:
                print(f"Warning: Could not attach file {attachment_url}: {e}")
    
    # Connect to SMTP server and send email
    try:
        if SMTP_USE_SSL:
            # Use SSL (typically port 465)
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30)
        else:
            # Use TLS (typically port 587)
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
            if SMTP_USE_TLS:
                server.starttls()
        
        # Login
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(SMTP_FROM_EMAIL, [to_email], text)
        
        # Close connection
        server.quit()
        
        return f"Email sent successfully to {to_email}"
        
    except smtplib.SMTPAuthenticationError as e:
        raise ValueError(f"SMTP authentication failed: {str(e)}")
    except smtplib.SMTPRecipientsRefused as e:
        raise ValueError(f"Recipient email address rejected: {str(e)}")
    except smtplib.SMTPServerDisconnected as e:
        raise ValueError(f"SMTP server disconnected: {str(e)}")
    except smtplib.SMTPException as e:
        raise ValueError(f"SMTP error: {str(e)}")
    except socket.gaierror as e:
        raise ValueError(f"DNS resolution failed for SMTP host '{SMTP_HOST}'. Please check SMTP_HOST environment variable: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to send email: {str(e)}")


def send_bulk_emails(recipients: list, subject: str, html_body: str, attachments: Optional[List[str]] = None):
    results = []

    for email in recipients:
        try:
            msg_id = send_single_email(email, subject, html_body, attachments)
            results.append({"email": email, "status": "sent", "message_id": msg_id})
            time.sleep(0.1)  # throttle to avoid rate limits
        except Exception as e:
            results.append({"email": email, "status": "failed", "error": str(e)})

    return results

def build_email_from_template(
    db: Session,
    client_id: int,
    template_name: str,
    variables: Optional[List[str]] = None
) -> tuple[str, str]:  # Returns (subject, body)
    """
    Build email subject and body from template, replacing variables.
    """
    template = db.query(EmailTemplate).filter(
        EmailTemplate.template_name == template_name,
        EmailTemplate.client_id == client_id,
        EmailTemplate.is_active == True
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail=f"Email template '{template_name}' not found")
    
    subject = template.subject
    body = template.body
    
    # Replace variables {{1}}, {{2}}, etc. with provided values
    if variables:
        for idx, val in enumerate(variables, start=1):
            pattern = rf"{{{{{idx}}}}}"
            subject = re.sub(pattern, str(val), subject)
            body = re.sub(pattern, str(val), body)
    
    return subject, body

@router.post("/send-email")
def send_email(payload: EmailRequest):
    try:
        return send_bulk_emails(
            recipients=payload.recipients,
            subject=payload.subject,
            html_body=payload.body,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-email-to-customers")
def send_email_to_customers(
    data: SendEmailRequest,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Send emails to selected customers using templates.
    Similar to send_message for WhatsApp but for emails.
    """
    try:
        if not data.customers:
            raise HTTPException(status_code=400, detail="No customers selected")
        if not data.templates:
            raise HTTPException(status_code=400, detail="No templates selected")
        
        template_name = data.templates[0]
        results = []
        
        # Determine data source
        data_source = data.data_source or "woocommerce"
        
        # For Excel customers, get the customer data first
        excel_customers_map = {}
        if data_source == "excel":
            if not data.file_id:
                raise HTTPException(status_code=400, detail="file_id is required for Excel data source")
            excel_data = get_customers_table_from_db(db, current_client, data.file_id)
            # Create a map of customer_id -> customer data
            for customer in excel_data.get("rows", []):
                cid = customer.get("customer_id") or customer.get("id")
                if cid:
                    excel_customers_map[str(cid)] = customer
                    excel_customers_map[int(cid) if str(cid).isdigit() else cid] = customer
        
        for customer_id in data.customers:
            customer_email = None
            customer_name = None
            
            # Get customer data based on data source
            if data_source == "excel":
                # Look up in Excel customers map
                excel_customer = excel_customers_map.get(customer_id) or excel_customers_map.get(str(customer_id))
                if not excel_customer:
                    results.append({
                        "customer_id": customer_id,
                        "status": "failed",
                        "error": "Customer not found in Excel data"
                    })
                    continue
                
                customer_email = excel_customer.get("email")
                customer_name = excel_customer.get("customer_name") or excel_customer.get("name")
                
                if not customer_email:
                    results.append({
                        "customer_id": customer_id,
                        "email": None,
                        "status": "failed",
                        "error": "Customer has no email address"
                    })
                    continue
            else:
                # WooCommerce customers
                customer = db.query(Customer).filter(
                    Customer.id == customer_id,
                    Customer.client_id == current_client.id
                ).first()
                
                if not customer:
                    results.append({
                        "customer_id": customer_id,
                        "status": "failed",
                        "error": "Customer not found"
                    })
                    continue
                
                if not customer.email:
                    results.append({
                        "customer_id": customer_id,
                        "email": None,
                        "status": "failed",
                        "error": "Customer has no email address"
                    })
                    continue
                
                customer_email = customer.email
                customer_name = f"{customer.first_name} {customer.last_name}".strip()
            
            # Get customer-specific variables
            customer_vars = None
            if data.variables and customer_id in data.variables:
                customer_vars = data.variables[customer_id]
            
            # Build email from template
            try:
                subject, body = build_email_from_template(
                    db=db,
                    client_id=current_client.id,
                    template_name=template_name,
                    variables=customer_vars
                )
                
                # Override with provided subject/body if given
                if data.subject:
                    subject = data.subject
                if data.body:
                    body = data.body
            except HTTPException as e:
                results.append({
                    "customer_id": customer_id,
                    "email": customer.email,
                    "status": "failed",
                    "error": str(e.detail)
                })
                continue
            
            # Send email
            try:
                send_single_email(
                    to_email=customer_email,
                    subject=subject,
                    html_body=body,
                    attachments=data.attachments
                )
                
                # Save to database (customer_id can be None for Excel customers)
                email_msg = EmailMessage(
                    customer_id=customer_id if data_source == "woocommerce" else None,
                    client_id=current_client.id,
                    direction="outgoing",
                    to_email=customer_email,
                    subject=subject,
                    body=body,
                    template_name=template_name,
                    status="sent",
                    timestamp=datetime.utcnow()
                )
                db.add(email_msg)
                
                results.append({
                    "customer_id": customer_id,
                    "email": customer_email,
                    "status": "sent",
                    "message": "Email sent successfully"
                })
            except Exception as e:
                # Save failed message to database
                email_msg = EmailMessage(
                    customer_id=customer_id if data_source == "woocommerce" else None,
                    client_id=current_client.id,
                    direction="outgoing",
                    to_email=customer_email,
                    subject=subject,
                    body=body,
                    template_name=template_name,
                    status="failed",
                    error_message=str(e),
                    timestamp=datetime.utcnow()
                )
                db.add(email_msg)
                
                results.append({
                    "customer_id": customer_id,
                    "email": customer_email,
                    "status": "failed",
                    "error": str(e)
                })
        
        db.commit()
        return results
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Email Template CRUD operations
@router.get("/email-templates", response_model=List[EmailTemplateBase])
def get_email_templates(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)
):
    """Get all email templates for the current client."""
    templates = db.query(EmailTemplate).filter(
        EmailTemplate.client_id == current_client.id
    ).all()
    return templates

@router.post("/email-templates", response_model=EmailTemplateBase)
def create_email_template(
    template: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)
):
    """Create a new email template."""
    # Check if template name already exists
    existing = db.query(EmailTemplate).filter(
        EmailTemplate.template_name == template.template_name,
        EmailTemplate.client_id == current_client.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    new_template = EmailTemplate(
        client_id=current_client.id,
        template_name=template.template_name,
        subject=template.subject,
        category=template.category,
        language=template.language,
        body=template.body,
        is_active=template.is_active
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.put("/email-templates/{template_id}", response_model=EmailTemplateBase)
def update_email_template(
    template_id: int,
    template_update: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)
):
    """Update an existing email template."""
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.client_id == current_client.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update fields if provided
    if template_update.template_name is not None:
        # Check if new name conflicts with another template
        existing = db.query(EmailTemplate).filter(
            EmailTemplate.template_name == template_update.template_name,
            EmailTemplate.client_id == current_client.id,
            EmailTemplate.id != template_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Template name already exists")
        template.template_name = template_update.template_name
    
    if template_update.subject is not None:
        template.subject = template_update.subject
    if template_update.category is not None:
        template.category = template_update.category
    if template_update.language is not None:
        template.language = template_update.language
    if template_update.body is not None:
        template.body = template_update.body
    if template_update.is_active is not None:
        template.is_active = template_update.is_active
    
    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    return template

@router.delete("/email-templates/{template_id}")
def delete_email_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)
):
    """Delete an email template."""
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.client_id == current_client.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}

@router.post("/upload-email-attachment")
async def upload_email_attachment(
    file: UploadFile = File(...),
    current_client: Client = Depends(get_current_client)
):
    """
    Upload an attachment file to Cloudinary and return the URL.
    This URL can then be used in the email sending endpoint.
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Generate a safe public_id
        import re
        import time
        public_id_safe = re.sub(r'[^A-Za-z0-9_-]', '_', file.filename)
        public_id = f"email_attachments/{current_client.id}/{public_id_safe}_{int(time.time())}"
        
        # Upload to Cloudinary
        file_buffer = BytesIO(file_content)
        result = cloudinary.uploader.upload(
            file_buffer,
            resource_type="raw",
            folder="email_attachments",
            public_id=public_id,
            use_filename=False
        )
        
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "filename": file.filename,
            "size": len(file_content)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")