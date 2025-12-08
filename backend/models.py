from sqlalchemy import ( Column, Integer, BigInteger, String, Float, ForeignKey, DateTime, Index, Text, Boolean, UniqueConstraint, JSON, LargeBinary)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from cryptography.fernet import Fernet
import re
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import relationship

# ------------------------------
# 1️⃣ Load environment variables
# ------------------------------
ENV_FILE = os.getenv("ENV_FILE", ".env")
env_path = os.path.join(os.path.dirname(__file__), ENV_FILE)
load_dotenv(dotenv_path=env_path)

FERNET_KEY = os.getenv("FERNET_KEY")

if not FERNET_KEY:
    raise ValueError("FERNET_KEY not set in environment variables")

fernet = Fernet(FERNET_KEY)
Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    company_details = Column(String, nullable=True)
    # WooCommerce-related fields (will store encrypted values)
    store_url = Column(String, nullable=True)
    _consumer_key = Column("consumer_key", String, nullable=True)
    _consumer_secret = Column("consumer_secret", String, nullable=True)
    user_type = Column(String, default="client")
    is_active = Column(Boolean, default=True)
    is_logged_in = Column(Boolean, default=False)
    last_login_time = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    sync_status = Column(String, default="PENDING")  # PENDING, IN_PROGRESS, COMPLETE, FAILED
    orders_count = Column(Integer, default=0)
    accepted_terms = Column(Boolean, default=False)
    terms_accepted_at = Column(DateTime(timezone=True), nullable=True)
    terms_version = Column(String, nullable=True)
    # 🔗 Relationship to customers
    whatsapp_messages = relationship("WhatsAppMessage", back_populates="client", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="client", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="client", uselist=False)
    whatsapp_templates = relationship("WhatsAppTemplate", back_populates="client", cascade="all, delete-orphan")
    uploaded_files = relationship("UploadedFile", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Client(email={self.email}, store_url={self.store_url})>"

    # --- Encryption-aware properties ---

    @property
    def consumer_key(self):
        """Return decrypted consumer key"""
        if self._consumer_key:
            return fernet.decrypt(self._consumer_key.encode()).decode()
        return None

    @consumer_key.setter
    def consumer_key(self, value):
        """Encrypt and store consumer key"""
        if value:
            self._consumer_key = fernet.encrypt(value.encode()).decode()
        else:
            self._consumer_key = None

    @property
    def consumer_secret(self):
        """Return decrypted consumer secret"""
        if self._consumer_secret:
            return fernet.decrypt(self._consumer_secret.encode()).decode()
        return None

    @consumer_secret.setter
    def consumer_secret(self, value):
        """Encrypt and store consumer secret"""
        if value:
            self._consumer_secret = fernet.encrypt(value.encode()).decode()
        else:
            self._consumer_secret = None
    @property
    def is_premium(self):
        return (
            self.subscription is not None
            and self.subscription.status in ["trial", "active"]
        )

class Customer(Base):

    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, unique=True, index=True)
    # 🔗 Reference back to client
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    client = relationship("Client", back_populates="customers")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    address = relationship("Address", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    whatsapp_messages = relationship("WhatsAppMessage", back_populates="customer", cascade="all, delete-orphan")

class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    company = Column(String)
    address_1 = Column(String)
    address_2 = Column(String)
    city = Column(String)
    state = Column(String)
    postcode = Column(String)
    country = Column(String)
    customer = relationship("Customer", back_populates="address")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)  # internal DB id
    external_id = Column(BigInteger, unique=True, index=True, nullable=True)  # WooCommerce ID (previously `order_id`)
    order_key = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"))
    status = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, index=True, nullable=False)
    payment_method = Column(String, nullable=True)
    attribution_referrer = Column(String, nullable=True)
    session_pages = Column(Integer, nullable=True)
    session_count = Column(Integer, nullable=True)
    device_type = Column(String, nullable=True)
    customer = relationship("Customer", back_populates="orders", passive_deletes=True)
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(BigInteger, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    short_description = Column(Text, nullable=True)
    regular_price = Column(Float, nullable=True)
    sales_price = Column(Float, nullable=True)
    total_sales = Column(Integer, nullable=True)
    categories = Column(String, nullable=True)  # stringified list or JSON
    stock_status = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    date_created = Column(DateTime, nullable=True)
    date_modified = Column(DateTime, nullable=True)

    # ✅ Relationship back to OrderItem
    order_items = relationship("OrderItem", back_populates="product")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.external_id", ondelete="SET NULL"))  # ✅ This is essential
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    order = relationship("Order", back_populates="items", passive_deletes=True)

    # ✅ Relationship to Product
    product = relationship("Product", back_populates="order_items")

class SyncState(Base):
    __tablename__ = "sync_state"
    key = Column(String, primary_key=True)
    value = Column(String)

class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    direction = Column(String, nullable=False)  # "incoming" or "outgoing"
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=True)  # ✅ NEW: sent, delivered, read
    whatsapp_message_id = Column(String, nullable=True, unique=True)

    # 🔙 Relationship back to customer
    customer = relationship("Customer", back_populates="whatsapp_messages")
    client = relationship("Client", back_populates="whatsapp_messages")

class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    template_name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String(100))
    language = Column(String(10))
    status = Column(String(50))
    body = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    client = relationship("Client", back_populates="whatsapp_templates")

    @property
    def variables(self) -> list[str]:
        return re.findall(r"{{.*?}}", self.body or "")

class WhatsAppCredentials(Base):
    __tablename__ = "whatsapp_credentials"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=False)

    # Encrypted columns (similar to WooCommerce keys)
    _phone_number_id = Column("phone_number_id", String, nullable=False)
    _waba_id = Column("waba_id", String, nullable=False)
    _access_token = Column("access_token", String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", backref="whatsapp_credentials", uselist=False)

    # Encryption wrappers -----------------------

    @property
    def phone_number_id(self):
        return fernet.decrypt(self._phone_number_id.encode()).decode()

    @phone_number_id.setter
    def phone_number_id(self, value):
        self._phone_number_id = fernet.encrypt(value.encode()).decode()

    @property
    def waba_id(self):
        return fernet.decrypt(self._waba_id.encode()).decode()

    @waba_id.setter
    def waba_id(self, value):
        self._waba_id = fernet.encrypt(value.encode()).decode()

    @property
    def access_token(self):
        return fernet.decrypt(self._access_token.encode()).decode()

    @access_token.setter
    def access_token(self, value):
        self._access_token = fernet.encrypt(value.encode()).decode()

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)         # Example: "Standard"
    description = Column(String, nullable=True)

    price = Column(Float, nullable=False)                      # e.g., 10.00 USD
    currency = Column(String, default="KWD")

    trial_period_days = Column(Integer, default=7)            # 7 days
    billing_cycle = Column(String, default="monthly")          # monthly / yearly

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (
        UniqueConstraint('name', 'billing_cycle', name='uq_plan_name_cycle'),
    )

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), unique=True)
    client = relationship("Client", back_populates="subscription")

    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    plan = relationship("SubscriptionPlan")

    gateway_subscription_id = Column(String, nullable=True)   # Tap or MyFatoorah
    gateway_customer_id = Column(String, nullable=True)

    status = Column(String, default="trial")                  # trial, active, expired, canceled

    trial_end = Column(DateTime, nullable=True)               # end of free 3 months
    current_period_end = Column(DateTime, nullable=True)      # next renewal date

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# app/models.py
# Note: All imports are now at the top of the file
# Use the same Base instance from above - do NOT create a new one
# Base is already defined at line 24

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    total_rows = Column(Integer, nullable=False)
    total_columns = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # raw file storage (optional: can also store just a path)
    # Since we're using Cloudinary, this can be nullable
    file_data = Column(LargeBinary, nullable=True)
    
    # Cloudinary storage fields
    cloudinary_url = Column(String, nullable=True)
    cloudinary_public_id = Column(String, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_id = Column(UUID(as_uuid=False), ForeignKey("guests.id"), nullable=True)  # <-- MATCH TYPE
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)  # For WooCommerce clients

    # relationships
    rows = relationship("FileRow", back_populates="file", cascade="all, delete-orphan")
    columns = relationship("FileColumn", back_populates="file", cascade="all, delete-orphan")
    guest = relationship("Guest", backref="files")
    mappings = relationship("ColumnMapping", back_populates="file", cascade="all, delete-orphan")
    client = relationship("Client", back_populates="uploaded_files")

class FileColumn(Base):
    __tablename__ = "file_columns"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("uploaded_files.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    dtype = Column(String, nullable=True)  # store pandas dtype

    file = relationship("UploadedFile", back_populates="columns")

class FileRow(Base):
    __tablename__ = "file_rows"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("uploaded_files.id", ondelete="CASCADE"))
    data = Column(JSONB, nullable=False)  # store row as JSON

    file = relationship("UploadedFile", back_populates="rows")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    user_type = Column(String, default="user")  # or "admin"

class Guest(Base):
    __tablename__ = "guests"
    # store as text/uuid string; using PG UUID type is cleaner if you use Postgres
    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # optional retention policy

class ColumnMapping(Base):
    __tablename__ = "column_mappings"

    id = Column(Integer, primary_key=True, index=True)
    # if file_id is null → user-level default mapping for analysis_type
    file_id = Column(Integer, ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_id = Column(UUID(as_uuid=False), ForeignKey("guests.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)  # For WooCommerce clients

    analysis_type = Column(String, nullable=False)   # e.g. "order", "customer", "product"
    mapping = Column(JSON, nullable=False)           # e.g. {"orderId": "Order ID", ...}

    is_default = Column(Boolean, default=False)      # optional: true if it's a user-default mapping
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    file = relationship("UploadedFile", back_populates="mappings")
    user = relationship("User", backref="column_mappings")
    guest = relationship("Guest", backref="column_mappings")

    # helpful index to speed lookups; consider unique constraints in migration (see below)
    __table_args__ = (
        Index("ix_column_mappings_file_user_analysis", "file_id", "user_id", "analysis_type"),
    )