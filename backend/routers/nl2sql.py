# backend/routers/nl2sql_router.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import os
import models
from nl2sql import NL2SQL
import numpy as np
from sqlalchemy.orm import Session
from database import get_db
from models import Client
from utils.subscription import require_feature
from utils.auth import get_current_client
# from agents.pandas_agent import analyze_excel_from_cloudinary
from schemas import AskRequest
from models import UploadedFile
# Load environment variables
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

# Initialize NL2SQL once
nl2sql = NL2SQL(
    database_url=os.getenv("DATABASE_URL"),
    llm_provider="openai",
    api_key=os.getenv("OPENAI_API_KEY")
)

router = APIRouter()

def to_python(obj):
    import numpy as np
    import pandas as pd

    if isinstance(obj, np.generic):
        return obj.item()

    if isinstance(obj, np.ndarray):
        return obj.tolist()

    if isinstance(obj, pd.DataFrame):
        # Convert DataFrame → list of dicts → convert nested numpy
        return [to_python(row) for row in obj.to_dict(orient="records")]

    if isinstance(obj, dict):
        return {k: to_python(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [to_python(v) for v in obj]

    return obj


# Pydantic model for input
class QueryRequest(BaseModel):
    question: str

@router.post("/nl2sql")
def get_sql_result(
    request: QueryRequest,
    current_client: Client = Depends(require_feature("nl2sql")),
    db: Session = Depends(get_db)
):
    """
    Execute natural language query against the database.
    
    Requires: Starter Plan, Pro Plan, or All Unlimited Plan subscription.
    """
    try:
        result = nl2sql.ask(request.question)

        print("🔍 Raw nl2sql result:", result)
        print("🔍 Types in results:", {k: type(v) for k, v in result.items()})
        # print(f"🔍 Client ID: {current_client.id}")

        return {
            "sql_query": result["sql_query"],
            "results": to_python(result["results"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

