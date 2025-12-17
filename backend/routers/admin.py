from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import io

from schemas import AdminRegisterRequest, LoginRequest, ClientStatusUpdateRequest
from database import get_db
from utils.auth import get_current_client, hash_password, create_access_token, verify_password
from models import Client, UploadedFile

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
):
    """
    Create a new admin user (stored in the `clients` table with user_type='admin').
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
