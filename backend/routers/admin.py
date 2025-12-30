from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import io

from schemas import AdminRegisterRequest, LoginRequest, ClientStatusUpdateRequest, ForgotPasswordRequest, ResetPasswordRequest
from database import get_db
from utils.auth import get_current_client, hash_password, create_access_token, verify_password
from models import Client, UploadedFile
from routers.send_mail import send_single_email
from datetime import datetime, timezone, timedelta
import secrets
import os

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_client(
    current_client: Client = Depends(get_current_client)
) -> Client:
    """Verify that the current client is an admin"""
    if current_client.user_type != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    return current_client


@router.post("/login")
def login_admin(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login admin user. Verifies credentials and returns JWT token.
    Only users with user_type='admin' can login through this endpoint.
    """
    # --- Check if user exists ---
    user = db.query(Client).filter(Client.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # --- Verify user is an admin ---
    if user.user_type != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    
    # --- Check if admin is active ---
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Admin account is disabled. Please contact support."
        )
    
    # --- Update login status ---
    user.is_logged_in = True
    user.last_login_time = datetime.utcnow()
    db.commit()
    
    # --- Create JWT token ---
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "client_name": user.client_name,
        "user_type": user.user_type,
        "message": "Admin login successful",
    }


@router.post("/register")
def register_admin(
    request: AdminRegisterRequest,
    db: Session = Depends(get_db),
    current_admin: Client = Depends(get_admin_client),
):
    """
    Create a new admin user (stored in the `clients` table with user_type='admin').
    Only existing admins can register new admins.
    """
    # Check if email already exists
    existing = db.query(Client).filter(Client.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_client = Client(
        email=request.email,
        hashed_password=hash_password(request.password),
        client_name=request.full_name,
        # company_details=request.company,
        user_type="admin",
        is_logged_in=False,
        is_active=True,
        last_login_time=None,
    )

    db.add(admin_client)
    db.commit()
    db.refresh(admin_client)

    # --- Create JWT token for the newly created admin ---
    access_token = create_access_token(
        data={"sub": admin_client.email, "user_id": admin_client.id}
    )

    return {
        "message": "Admin user created successfully",
        "client_id": admin_client.id,
        "email": admin_client.email,
        "user_type": admin_client.user_type,
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client)
):
    """
    Get admin dashboard statistics:
    - Total clients count
    - Total Excel files count
    - WooCommerce connected count (clients with WooCommerce credentials)
    """
    # Total clients count
    total_clients = db.query(func.count(Client.id)).scalar()

    # Total Excel files count
    total_excel_files = db.query(func.count(UploadedFile.id)).scalar()

    # WooCommerce connected count (clients with store_url, consumer_key, and consumer_secret)
    woo_commerce_connected = db.query(func.count(Client.id)).filter(
        Client.store_url.isnot(None),
        Client._consumer_key.isnot(None),
        Client._consumer_secret.isnot(None)
    ).scalar()

    return {
        "total_clients": total_clients or 0,
        "total_excel_files": total_excel_files or 0,
        "woo_commerce_connected": woo_commerce_connected or 0
    }


@router.get("/clients")
def list_clients(
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client),
):
    """
    List all clients for the admin dashboard client table.

    Returns items with:
    - id
    - name
    - email
    - status: "active" | "disabled"
    - files_count: number of uploaded Excel files
    - woo_commerce: bool – whether WooCommerce is connected
    """
    # Pre-compute files count per client
    files_per_client = {
        client_id: count
        for client_id, count in db.query(
            UploadedFile.client_id,
            func.count(UploadedFile.id)
        )
        .group_by(UploadedFile.client_id)
        .all()
    }

    clients = db.query(Client).all()

    result = []
    for c in clients:
        result.append(
            {
                "id": c.id,
                "name": c.client_name or c.email,
                "phone": c.phone,
                "email": c.email,
                "user_type": c.user_type,
                "created_at": c.terms_accepted_at.isoformat() if c.terms_accepted_at else None,
                "last_login_time": c.last_login_time.isoformat() if c.last_login_time else None,
                "status": "active" if c.is_active else "disabled",
                "files_count": files_per_client.get(c.id, 0),
                "woo_commerce": bool(
                    c.store_url and c._consumer_key is not None and c._consumer_secret is not None
                ),
            }
        )

    return result


@router.get("/integrations/woocommerce")
def list_woocommerce_integrations(
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client),
):
    """
    List all clients with WooCommerce stores connected.
    
    Returns:
    - client_id: ID of the client
    - client_name: Name of the client
    - email: Client email
    - store_url: WooCommerce store URL
    - last_synced_at: Last sync timestamp
    - sync_status: Current sync status
    - orders_count: Total orders synced
    - is_active: Whether the client account is active
    """
    # Get all clients with WooCommerce credentials
    clients = db.query(Client).filter(
        Client.store_url.isnot(None),
        Client._consumer_key.isnot(None),
        Client._consumer_secret.isnot(None)
    ).all()
    
    result = []
    for c in clients:
        result.append({
            "client_id": c.id,
            "client_name": c.client_name or c.email,
            "email": c.email,
            "phone": c.phone,
            "store_url": c.store_url,
            "last_synced_at": c.last_synced_at.isoformat() if c.last_synced_at else None,
            "sync_status": c.sync_status,
            "orders_count": c.orders_count or 0,
            "is_active": c.is_active,
            "status": "active" if c.is_active else "disabled",
        })
    
    return result


@router.patch("/clients/{client_id}/toggle-status")
def toggle_client_status(
    client_id: int,
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client),
):
    """
    Enable or disable a client account.
    Toggles the is_active field for the specified client.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Prevent disabling yourself
    if client.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot disable your own account"
        )
    
    # Toggle the status
    client.is_active = not client.is_active
    db.commit()
    db.refresh(client)
    
    return {
        "message": f"Client {'enabled' if client.is_active else 'disabled'} successfully",
        "client_id": client.id,
        "email": client.email,
        "status": "active" if client.is_active else "disabled",
        "is_active": client.is_active,
    }


@router.patch("/clients/{client_id}/status")
def set_client_status(
    client_id: int,
    request: ClientStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client),
):
    """
    Set the active status of a client account.
    
    Request body:
    - is_active: Boolean value to set (true to enable, false to disable)
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Prevent disabling yourself
    if client.id == admin.id and not request.is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot disable your own account"
        )
    
    # Set the status
    client.is_active = request.is_active
    db.commit()
    db.refresh(client)
    
    return {
        "message": f"Client {'enabled' if client.is_active else 'disabled'} successfully",
        "client_id": client.id,
        "email": client.email,
        "status": "active" if client.is_active else "disabled",
        "is_active": client.is_active,
    }


@router.get("/clients/{client_id}/files")
def list_client_files(
    client_id: int,
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client),
):
    """Return uploaded Excel files for a specific client."""
    files = (
        db.query(UploadedFile)
        .filter(UploadedFile.client_id == client_id)
        .order_by(UploadedFile.uploaded_at.desc())
        .all()
    )

    def human_size(num_bytes: int | None) -> str:
        if not num_bytes:
            return ""
        for unit in ["B", "KB", "MB", "GB"]:
            if num_bytes < 1024:
                return f"{num_bytes:.1f} {unit}"
            num_bytes /= 1024
        return f"{num_bytes:.1f} TB"

    result = []
    for f in files:
        size_str = human_size(len(f.file_data)) if f.file_data else ""
        result.append(
            {
                "id": f.id,
                "name": f.filename,
                "size": size_str,
                "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                "download_url": f.cloudinary_url or f"/admin/files/{f.id}/download",
            }
        )

    return result


@router.get("/files/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    admin: Client = Depends(get_admin_client),
):
    """Download a specific uploaded file.

    If a Cloudinary URL exists, redirect to it; otherwise stream the binary data.
    """
    f = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    # Prefer Cloudinary URL when available
    if f.cloudinary_url:
        return RedirectResponse(url=f.cloudinary_url)

    if not f.file_data:
        raise HTTPException(status_code=404, detail="File data not available")

    return StreamingResponse(
        io.BytesIO(f.file_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{f.filename}"'
        },
    )


# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.post("/forgot-password")
def forgot_password_admin(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Send password reset email to admin user.
    Only works for users with user_type='admin'.
    """
    try:
        # Find user by email
        user = db.query(Client).filter(Client.email == request.email).first()
        
        # Always return success to prevent email enumeration
        if not user:
            return {
                "success": True,
                "message": "If an admin account with that email exists, a password reset link has been sent."
            }
        
        # Verify user is an admin
        if user.user_type != "admin":
            # Return success even if not admin to prevent enumeration
            return {
                "success": True,
                "message": "If an admin account with that email exists, a password reset link has been sent."
            }
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        token_expires = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour
        
        # Store token in database
        user.password_reset_token = reset_token
        user.password_reset_token_expires = token_expires
        db.commit()
        
        # Create reset link
        reset_link = f"{FRONTEND_URL}/admin/reset-password?token={reset_token}"
        
        # Send email
        email_subject = "Admin Password Reset Request"
        email_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 30px 20px; }}
                .content h2 {{ color: #7c3aed; margin-top: 0; }}
                .button {{ display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }}
                .button:hover {{ background-color: #6d28d9; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }}
                .footer a {{ color: #7c3aed; text-decoration: none; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Admin Password Reset</h1>
                </div>
                <div class="content">
                    <h2>Hello Admin,</h2>
                    <p>You have requested to reset your admin account password. Click the button below to reset it:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #7c3aed; background-color: #f9fafb; padding: 10px; border-radius: 4px;">{reset_link}</p>
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <p>If you did not request this password reset, please ignore this email and contact support immediately.</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>
                        <a href="{FRONTEND_URL}/admin">Admin Portal</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_single_email(
                to_email=user.email,
                subject=email_subject,
                html_body=email_body
            )
        except Exception as e:
            print(f"Error sending admin password reset email: {e}")
            # Don't fail the request, just log the error
        
        return {
            "success": True,
            "message": "If an admin account with that email exists, a password reset link has been sent."
        }
    except Exception as e:
        print(f"Error in admin forgot password: {e}")
        # Always return success to prevent email enumeration
        return {
            "success": True,
            "message": "If an admin account with that email exists, a password reset link has been sent."
        }


@router.post("/reset-password")
def reset_password_admin(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset admin password using the reset token.
    Only works for users with user_type='admin'.
    """
    try:
        # Find user by reset token
        user = db.query(Client).filter(
            Client.password_reset_token == request.token
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )
        
        # Verify user is an admin
        if user.user_type != "admin":
            raise HTTPException(
                status_code=403,
                detail="This reset token is not valid for admin accounts"
            )
        
        # Check if token is expired
        if user.password_reset_token_expires and user.password_reset_token_expires < datetime.now(timezone.utc):
            # Clear expired token
            user.password_reset_token = None
            user.password_reset_token_expires = None
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Reset token has expired. Please request a new one."
            )
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters long"
            )
        
        # Update password
        user.hashed_password = hash_password(request.new_password)
        user.password_reset_token = None
        user.password_reset_token_expires = None
        db.commit()
        
        return {
            "success": True,
            "message": "Password has been reset successfully. You can now login with your new password."
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in admin reset password: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while resetting your password. Please try again."
        )
