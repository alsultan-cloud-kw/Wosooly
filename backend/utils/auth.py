from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from database import get_db
from fastapi.security import OAuth2PasswordBearer
from models import Client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")  # store this safely in .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60*24  # 24 hour

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# --- Password helpers ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# --- JWT helpers ---
def create_access_token(data: dict, expires_delta: timedelta | None = None):

    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_client(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Client:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        client_id: int = payload.get("user_id")
        if client_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=401, detail="User not found")
    return client