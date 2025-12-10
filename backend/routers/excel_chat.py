"""
Excel Chat Router
Provides natural language query interface for Excel data
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import get_db
from utils.auth import get_current_client
from models import Client, UploadedFile
from excel_chat.query_engine import ExcelQueryEngine

router = APIRouter()

class ExcelChatRequest(BaseModel):
    question: str
    file_id: Optional[int] = None

class ExcelChatResponse(BaseModel):
    answer: str
    result: Optional[Any] = None
    code: Optional[str] = None
    error: Optional[str] = None
    type: Optional[str] = None

@router.post("/query", response_model=ExcelChatResponse)
def query_excel_data(
    request: ExcelChatRequest,
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Query Excel data using natural language.
    
    Examples:
    - "Show me top 10 customers by total orders"
    - "What's the total revenue in December?"
    - "Which products sold the most last month?"
    - "How many orders do I have?"
    """
    try:
        # Initialize query engine
        engine = ExcelQueryEngine(
            db=db,
            client=current_client,
            file_id=request.file_id
        )
        
        # Process query
        result = engine.query(request.question)
        
        if result.get("error"):
            return ExcelChatResponse(
                answer=result["error"],
                error=result["error"],
                result=None,
                code=result.get("code")
            )
        
        # Format response
        answer = result.get("explanation", "Query executed successfully")
        if result.get("result") is not None:
            answer = result.get("explanation", "Here are the results:")
        
        return ExcelChatResponse(
            answer=answer,
            result=result.get("result"),
            code=result.get("code"),
            error=None,
            type=result.get("type")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )

@router.get("/files")
def list_uploaded_files(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    List all uploaded Excel files for the current client.
    """
    files = (
        db.query(UploadedFile)
        .filter(UploadedFile.client_id == current_client.id)
        .order_by(UploadedFile.uploaded_at.desc())
        .all()
    )
    
    return {
        "files": [
            {
                "id": file.id,
                "filename": file.filename,
                "file_type": file.file_type,
                "total_rows": file.total_rows,
                "total_columns": file.total_columns,
                "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None
            }
            for file in files
        ]
    }
