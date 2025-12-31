from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import Client, UploadedFile, FileColumn, FileRow, ColumnMapping
from utils.auth import get_current_client
from schemas import ColumnMappingRequest, ColumnMappingResponse, ModelFieldsResponse, ModelFieldDefinition, AIMappingResponse, AIMappingSuggestion
from utils.ai_column_mapper import AIColumnMapper
import cloudinary
import cloudinary.uploader
import pandas as pd
import numpy as np
import io
import os
import math
from dotenv import load_dotenv
from datetime import datetime
import json
from typing import List, Optional
import re
import time
from io import BytesIO
import logging  # for error logging
import models
from utils.auth import get_current_client

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def clean_json(obj):
    """Recursively replace NaN/Infinity/-Infinity with None and convert datetime objects to strings for JSON compliance."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (datetime, pd.Timestamp)):
        # Convert datetime objects to ISO format string
        if isinstance(obj, pd.Timestamp):
            return obj.strftime('%Y-%m-%dT%H:%M:%S')
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json(v) for v in obj]
    elif hasattr(obj, 'isoformat'):  # Handle other datetime-like objects
        return obj.isoformat()
    return obj

@router.post("/excel-upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    response: Response = None,
    identity: Client = Depends(get_current_client),
):
    try:
        file_content = await file.read()

        # Sanitize filename
        public_id_safe = re.sub(r'[^A-Za-z0-9_-]', '_', file.filename)
        public_id = f"{public_id_safe}_{int(time.time())}"

        # Upload to Cloudinary
        file_buffer = BytesIO(file_content)
        result = cloudinary.uploader.upload(
            file_buffer,
            resource_type="raw",
            folder="uploads",
            public_id=public_id
        )

        # Parse file
        buffer = BytesIO(file_content)
        df = pd.read_excel(buffer, engine="openpyxl") \
            if not file.filename.endswith(".csv") else pd.read_csv(buffer)

        df = df.dropna(how="all")
        df.columns = [c.strip() for c in df.columns]

        # datetime serialization - handle both datetime64 and object columns with datetime values
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].dt.strftime('%Y-%m-%dT%H:%M:%S')
            elif df[col].dtype == 'object':
                # Check if any values in the column are datetime-like
                for idx in df.index:
                    val = df.at[idx, col]
                    if isinstance(val, (datetime, pd.Timestamp)):
                        if isinstance(val, pd.Timestamp):
                            df.at[idx, col] = val.strftime('%Y-%m-%dT%H:%M:%S')
                        else:
                            df.at[idx, col] = val.isoformat()

        df = df.where(pd.notnull(df), None)

        uploaded = models.UploadedFile(
            filename=file.filename,
            file_type=file.content_type,
            total_rows=len(df),
            total_columns=len(df.columns),
            file_data=file_content,
            cloudinary_url=result["secure_url"],
            cloudinary_public_id=result["public_id"],
            client_id=identity.id   # ✅ fixed
        )

        db.add(uploaded)
        db.commit()
        db.refresh(uploaded)

        # Save rows
        for _, row in df.iterrows():
            safe_row = clean_json(row.to_dict())
            db.add(models.FileRow(file_id=uploaded.id, data=safe_row))

        db.commit()

        # Optionally trigger auto-mapping (can be done asynchronously or on-demand)
        # For now, we'll let the frontend call the auto-map endpoint separately
        
        return {
            "message": "File uploaded successfully",
            "file_id": uploaded.id,
            "filename": uploaded.filename,
            "rows": uploaded.total_rows,
            "columns": uploaded.total_columns,
            "cloudinary_url": uploaded.cloudinary_url,
            "owner": identity.email,
        }

    except Exception as e:
        logger.error("Upload error:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/uploaded-files")
def get_uploaded_files(
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get all uploaded files for the current client.
    """
    files = db.query(UploadedFile).filter(
        UploadedFile.client_id == current_user.id
    ).order_by(UploadedFile.uploaded_at.desc()).all()
    
    return {
        "files": [
            {
                "id": file.id,
                "filename": file.filename,
                "file_type": file.file_type,
                "total_rows": file.total_rows,
                "total_columns": file.total_columns,
                "cloudinary_url": file.cloudinary_url,
                "uploaded_at": file.uploaded_at.isoformat()
            }
            for file in files
        ]
    }

@router.post("/auto-map-columns/{file_id}", response_model=AIMappingResponse)
def auto_map_columns(
    file_id: int,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Automatically map Excel columns to canonical fields using AI.
    Returns suggested mappings with confidence scores for customer, order, and product analysis types.
    """
    # Validate file_id
    if not file_id or file_id <= 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file_id: {file_id}. File ID must be a positive integer."
        )
    
    # Verify file belongs to client
    file = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == file_id,
            UploadedFile.client_id == current_client.id
        )
        .first()
    )
    
    if not file:
        raise HTTPException(
            status_code=404, 
            detail=f"File with ID {file_id} not found or does not belong to your account."
        )
    
    try:
        # Initialize AI mapper
        mapper = AIColumnMapper()
        
        # Get auto-mappings for all analysis types
        ai_mappings = mapper.auto_map_file(
            db=db,
            file_id=file_id,
            analysis_types=["customer", "order", "product"]
        )
        
        # Format for response
        response_data = {
            "customer": [],
            "order": [],
            "product": [],
            "file_id": file_id
        }
        
        for analysis_type in ["customer", "order", "product"]:
            if analysis_type in ai_mappings:
                for canonical_field, mapping_data in ai_mappings[analysis_type].items():
                    if mapping_data.get("excel_column"):
                        response_data[analysis_type].append(
                            AIMappingSuggestion(
                                canonical_field=canonical_field,
                                excel_column=mapping_data["excel_column"],
                                confidence=mapping_data.get("confidence", 0.5),
                                suggested_by="ai"
                            )
                        )
        
        return AIMappingResponse(**response_data)
    except Exception as e:
        logger.error(f"Error in AI column mapping for file_id {file_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating AI mappings: {str(e)}"
        )

@router.get("/uploaded-files/{file_id}")
def get_file_details(
    file_id: int,
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific uploaded file including columns.
    """
    # First check if file exists at all
    file_exists = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    
    if not file_exists:
        raise HTTPException(
            status_code=404, 
            detail=f"File with ID {file_id} does not exist."
        )
    
    # Then check if it belongs to the current user
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.client_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(
            status_code=403, 
            detail=f"File with ID {file_id} exists but does not belong to your account."
        )
    
    columns = db.query(FileColumn).filter(FileColumn.file_id == file_id).all()
    rows = db.query(FileRow).filter(FileRow.file_id == file_id).limit(10).all()
    
    return {
        "id": file.id,
        "filename": file.filename,
        "file_type": file.file_type,
        "total_rows": file.total_rows,
        "total_columns": file.total_columns,
        "cloudinary_url": file.cloudinary_url,
        "uploaded_at": file.uploaded_at.isoformat(),
        "columns": [
            {
                "id": col.id,
                "name": col.name,
                "dtype": col.dtype
            }
            for col in columns
        ],
        "sample_rows": [row.data for row in rows]
    }

# Column Mapping Endpoints
@router.get("/model-fields", response_model=ModelFieldsResponse)
def get_model_fields():
    """
    Get available model fields for Customer, Order, and Product analysis types.
    These fields can be mapped from Excel columns.
    """
    return ModelFieldsResponse(
        customer=[
            ModelFieldDefinition(
                field_name="customer_name",
                field_type="string",
                required=True,
                description="Customer's name"
            ),
            ModelFieldDefinition(
                field_name="customer_id",
                field_type="string",
                required=True,
                description="Customer's ID (civil id)"
            ),
            ModelFieldDefinition(
                field_name="first_name",
                field_type="string",
                required=True,
                description="Customer's first name"
            ),
            ModelFieldDefinition(
                field_name="last_name",
                field_type="string",
                required=True,
                description="Customer's last name"
            ),
            ModelFieldDefinition(
                field_name="City",
                field_type="string",
                required=True,
                description="City of the customer"
            ),
            ModelFieldDefinition(
                field_name="State",
                field_type="string",
                required=True,
                description="State of the customer"
            ),
            ModelFieldDefinition(
                field_name="Country",
                field_type="string",
                required=True,
                description="Country of the customer"
            ),
            ModelFieldDefinition(
                field_name="email",
                field_type="string",
                required=False,
                description="Customer's email address"
            ),
            ModelFieldDefinition(
                field_name="phone",
                field_type="string",
                required=True,
                description="Customer's phone number (unique identifier)"
            ),
        ],
        order=[
            ModelFieldDefinition(
                field_name="order_id",
                field_type="integer",
                required=False,
                description="Order ID"
            ),
            ModelFieldDefinition(
                field_name="quantity_ordered",
                field_type="integer",
                required=False,
                description="Quantity ordered"
            ),
            ModelFieldDefinition(
                field_name="status",
                field_type="string",
                required=True,
                description="Order status (e.g., pending, processing, completed)"
            ),
            ModelFieldDefinition(
                field_name="total_amount",
                field_type="float",
                required=True,
                description="Total order amount"
            ),
            ModelFieldDefinition(
                field_name="created_at",
                field_type="datetime",
                required=True,
                description="Order creation date and time"
            ),
            ModelFieldDefinition(
                field_name="payment_method",
                field_type="string",
                required=False,
                description="Payment method used"
            ),
            ModelFieldDefinition(
                field_name="attribution_referrer",
                field_type="string",
                required=False,
                description="Referrer URL for attribution"
            ),
            # ModelFieldDefinition(
            #     field_name="session_pages",
            #     field_type="integer",
            #     required=False,
            #     description="Number of pages visited in session"
            # ),
            # ModelFieldDefinition(
            #     field_name="session_count",
            #     field_type="integer",
            #     required=False,
            #     description="Session count"
            # ),
            # ModelFieldDefinition(
            #     field_name="device_type",
            #     field_type="string",
            #     required=False,
            #     description="Device type (mobile, desktop, etc.)"
            # ),
        ],
        product=[
            ModelFieldDefinition(
                field_name="product_id",
                field_type="integer",
                required=False,
                description="Product ID"
            ),
            ModelFieldDefinition(
                field_name="product_name",
                field_type="string",
                required=True,
                description="Product name"
            ),
            ModelFieldDefinition(
                field_name="short_description",
                field_type="text",
                required=False,
                description="Short product description"
            ),
            ModelFieldDefinition(
                field_name="regular_price",
                field_type="float",
                required=False,
                description="Regular product price"
            ),
            ModelFieldDefinition(
                field_name="sales_price",
                field_type="float",
                required=False,
                description="Sales/discounted price"
            ),
            ModelFieldDefinition(
                field_name="total_sales",
                field_type="integer",
                required=False,
                description="Total number of sales"
            ),
            ModelFieldDefinition(
                field_name="category",
                field_type="string",
                required=False,
                description="Product category (comma-separated or JSON)"
            ),
            ModelFieldDefinition(
                field_name="stock_status",
                field_type="string",
                required=False,
                description="Stock status (instock, outofstock, etc.)"
            ),
            ModelFieldDefinition(
                field_name="weight",
                field_type="float",
                required=False,
                description="Product weight"
            ),
            ModelFieldDefinition(
                field_name="date_created",
                field_type="datetime",
                required=False,
                description="Product creation date"
            ),
        ]
    )



@router.get("/column-mapping/default", response_model=List[ColumnMappingResponse])
def get_default_column_mappings(
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get all default/template column mappings for the current user (mappings without file_id).
    Also ensure all referenced columns are stored in FileColumn, using the latest uploaded file.
    """

    # ----------------------------------------------------
    # ✅ STEP 1 — Fetch default column mappings
    # ----------------------------------------------------
    mappings = db.query(ColumnMapping).filter(
        ColumnMapping.file_id.is_(None),
        ColumnMapping.client_id == current_user.id
    ).all()

    # ----------------------------------------------------
    # ✅ STEP 2 — Determine latest uploaded file_id
    # ----------------------------------------------------
    latest_file = (
        db.query(UploadedFile)
        .filter(UploadedFile.client_id == current_user.id)
        .order_by(desc(UploadedFile.uploaded_at))
        .first()
    )

    # If no files exist, return empty list instead of error (for template mode)
    if not latest_file:
        return []

    file_id = latest_file.id

    # ----------------------------------------------------
    # ✅ STEP 3 — Collect all column names referenced in the mappings
    # ----------------------------------------------------
    referenced_columns = set()

    for m in mappings:
        if isinstance(m.mapping, dict):
            referenced_columns.update([v.lower() for v in m.mapping.values()])

    # ----------------------------------------------------
    # ✅ STEP 4 — Fetch existing FileColumn entries for this file
    # ----------------------------------------------------
    existing_cols = {
        fc.name.lower()
        for fc in db.query(FileColumn).filter(FileColumn.file_id == file_id).all()
    }

    # ----------------------------------------------------
    # ✅ STEP 5 — Insert missing FileColumn entries
    # ----------------------------------------------------
    new_columns = []

    for col_name in referenced_columns:
        if col_name not in existing_cols:
            new_columns.append(
                FileColumn(
                    file_id=file_id,
                    name=col_name,
                    dtype="string"
                )
            )

    if new_columns:
        db.add_all(new_columns)
        db.commit()

    # Return the default mappings
    return mappings

@router.get("/column-mapping/{file_id}", response_model=List[ColumnMappingResponse])
def get_column_mappings(
    file_id: int,
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Get all column mappings for a specific file.
    Note: This route must come AFTER /column-mapping/default to avoid route conflicts.
    """
    # Verify file belongs to current user
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.client_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    mappings = db.query(ColumnMapping).filter(
        ColumnMapping.file_id == file_id
    ).all()
    
    return mappings

@router.post("/column-mapping", response_model=ColumnMappingResponse)
def create_or_update_column_mapping(
    request: ColumnMappingRequest,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Create or update a column mapping with FileColumn insertion.
    - If file_id provided but file not found → mapping becomes default (template)
    - If file_id missing → auto select latest uploaded file
    - Saves new column names into FileColumn
    """

    client_id = current_client.id

    # -------------------------
    # STEP 1 — Resolve file_id
    # -------------------------
    file_id = request.file_id

    if file_id:
        # Verify file belongs to this client
        file = (
            db.query(UploadedFile)
            .filter(
                UploadedFile.id == file_id,
                UploadedFile.client_id == client_id
            )
            .first()
        )

        if not file:
            file_id = None  # create default/template mapping
    else:
        # Auto-pick latest file for this client
        latest = (
            db.query(UploadedFile)
            .filter(UploadedFile.client_id == client_id)
            .order_by(desc(UploadedFile.uploaded_at))
            .first()
        )

        file_id = latest.id if latest else None

    # -------------------------
    # STEP 2 — Validate analysis_type
    # -------------------------
    if request.analysis_type not in ["order", "customer", "product"]:
        raise HTTPException(400, "Invalid analysis_type. Must be: order, customer, product")

    # -------------------------
    # STEP 3 — Insert FileColumn (only if file_id exists)
    # -------------------------
    if file_id:
        existing_cols = {
            fc.name.lower()
            for fc in db.query(FileColumn).filter(FileColumn.file_id == file_id).all()
        }

        new_file_columns = []
        for col_name in request.mapping.values():
            if col_name and col_name.lower() not in existing_cols:
                new_file_columns.append(
                    FileColumn(
                        file_id=file_id,
                        name=col_name,
                        dtype="string"
                    )
                )

        if new_file_columns:
            db.add_all(new_file_columns)
            db.commit()

    # -------------------------
    # STEP 4 — Find existing ColumnMapping
    # -------------------------
    if file_id:
        existing = (
            db.query(ColumnMapping)
            .filter(
                ColumnMapping.file_id == file_id,
                ColumnMapping.analysis_type == request.analysis_type
            )
            .first()
        )
    else:
        # default mapping for this client
        existing = (
            db.query(ColumnMapping)
            .filter(
                ColumnMapping.client_id == client_id,
                ColumnMapping.file_id.is_(None),
                ColumnMapping.analysis_type == request.analysis_type
            )
            .first()
        )

    # -------------------------
    # STEP 5 — Create or update ColumnMapping
    # -------------------------
    if existing:
        existing.mapping = request.mapping
        existing.updated_at = datetime.utcnow()
        existing.file_id = file_id
        existing.is_default = (file_id is None)
        db.commit()
        db.refresh(existing)
        return existing

    new_mapping = ColumnMapping(
        file_id=file_id,
        client_id=client_id,
        analysis_type=request.analysis_type,
        mapping=request.mapping,
        is_default=(file_id is None)
    )

    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)
    return new_mapping

@router.delete("/column-mapping/{file_id}/{analysis_type}")
def delete_column_mapping(
    file_id: int,
    analysis_type: str,
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Delete a column mapping for a specific file and analysis type.
    """
    # Verify file belongs to current user
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.client_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    mapping = db.query(ColumnMapping).filter(
        ColumnMapping.file_id == file_id,
        ColumnMapping.analysis_type == analysis_type
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    db.delete(mapping)
    db.commit()
    
    return {"message": "Mapping deleted successfully"}