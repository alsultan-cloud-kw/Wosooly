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
    phone = Column(String, unique=True, index=True, nullable=True)
    address = Column(String, nullable=True)
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
    # Password reset fields
    password_reset_token = Column(String, nullable=True)
    password_reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    # 🔗 Relationship to customers
    whatsapp_messages = relationship("WhatsAppMessage", back_populates="client", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="client", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="client", uselist=False)
    whatsapp_templates = relationship("WhatsAppTemplate", back_populates="client", cascade="all, delete-orphan")
    email_templates = relationship("EmailTemplate", back_populates="client", cascade="all, delete-orphan")
    uploaded_files = relationship("UploadedFile", back_populates="client", cascade="all, delete-orphan")
    # 🔗 Competitor / social media tracking (non-breaking addition)
    competitor_social_media_accounts = relationship(
        "CompetitorSocialMediaAccount",
        back_populates="client",
        cascade="all, delete-orphan",
    )
    competitor_brand_offers = relationship("CompetitorBrandOffer", back_populates="client", cascade="all, delete-orphan")
    competitor_website_accounts = relationship("CompetitorWebsiteAccount", back_populates="client", cascade="all, delete-orphan")
    competitor_business_configs = relationship("CompetitorBusinessConfig", back_populates="client", cascade="all, delete-orphan")
    competitor_news_sources = relationship("CompetitorNewsSource", back_populates="client", cascade="all, delete-orphan")
    competitor_news = relationship("CompetitorGoldNews", back_populates="client", cascade="all, delete-orphan")
    competitor_daily_news_summaries = relationship("CompetitorDailyNewsSummary", back_populates="client", cascade="all, delete-orphan")
    competitor_deep_research = relationship("CompetitorDeepResearchResult", back_populates="client", cascade="all, delete-orphan")
    competitor_analyzed_images = relationship("CompetitorAnalyzedImage", back_populates="client", cascade="all, delete-orphan")
    competitor_tiktok_hashtags = relationship("CompetitorTikTokHashtag", back_populates="client", cascade="all, delete-orphan")
    competitor_price_alerts = relationship("CompetitorPriceAlert", back_populates="client", cascade="all, delete-orphan")
    competitor_offer_suggestions = relationship("CompetitorOfferSuggestion", back_populates="client", cascade="all, delete-orphan")

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

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    template_name = Column(String, unique=True, index=True, nullable=False)
    subject = Column(String, nullable=False)
    category = Column(String(100), nullable=True)
    language = Column(String(10), nullable=True)
    body = Column(Text, nullable=False)  # HTML body
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    client = relationship("Client", back_populates="email_templates")

    @property
    def variables(self) -> list[str]:
        return re.findall(r"{{.*?}}", self.body or "")

class EmailMessage(Base):
    __tablename__ = "email_messages"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)  # Can be null for bulk sends
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    direction = Column(String, nullable=False)  # "incoming" or "outgoing"
    to_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)  # HTML body
    template_name = Column(String, nullable=True)  # Reference to template if used
    status = Column(String, nullable=True)  # sent, failed, delivered, etc.
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    customer = relationship("Customer", backref="email_messages")
    client = relationship("Client", backref="email_messages")

class EmailAttachment(Base):
    __tablename__ = "email_attachments"

    id = Column(Integer, primary_key=True, index=True)
    email_message_id = Column(Integer, ForeignKey("email_messages.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=True)  # Path to stored file
    cloudinary_url = Column(String, nullable=True)  # If using Cloudinary
    cloudinary_public_id = Column(String, nullable=True)
    content_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    email_message = relationship("EmailMessage", backref="attachments")

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

class InstagramCredentials(Base):
    __tablename__ = "instagram_credentials"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=False)

    # Encrypted columns (similar to WooCommerce keys)
    _username = Column("username", String, nullable=False)
    _password = Column("password", String, nullable=False)
    _email = Column("email", String, nullable=True)  # Optional email field

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", backref="instagram_credentials", uselist=False)

    # Encryption wrappers -----------------------

    @property
    def username(self):
        return fernet.decrypt(self._username.encode()).decode()

    @username.setter
    def username(self, value):
        self._username = fernet.encrypt(value.encode()).decode()

    @property
    def password(self):
        return fernet.decrypt(self._password.encode()).decode()

    @password.setter
    def password(self, value):
        self._password = fernet.encrypt(value.encode()).decode()

    @property
    def email(self):
        if self._email:
            return fernet.decrypt(self._email.encode()).decode()
        return None

    @email.setter
    def email(self, value):
        if value:
            self._email = fernet.encrypt(value.encode()).decode()
        else:
            self._email = None

class BusinessType(Base):
    __tablename__ = "business_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)  # Business type name
    is_predefined = Column(Boolean, default=False)  # True for predefined, False for user-added
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  # Who added it (null for predefined)
    
    created_by = relationship("Client", foreign_keys=[created_by_client_id])

    __table_args__ = (
        Index("ix_business_types_name", "name"),
    )

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


# ------------------------------
# Competitor / Social Media models (additive, does not touch existing tables)
# ------------------------------

class CompetitorSocialMediaAccount(Base):
    """
    Unified social media account for competitors (Instagram / TikTok / Snapchat, etc.)
    Matches Alembic table: competitor_social_media_accounts
    """

    __tablename__ = "competitor_social_media_accounts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    username = Column(String, nullable=False)
    brand_name = Column(String, nullable=False)
    platform = Column(String, nullable=False)  # e.g. "instagram", "tiktok", "snapchat"
    profile_url = Column(String, nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_social_media_accounts")

    __table_args__ = (
        UniqueConstraint("client_id", "username", "platform", name="uq_social_account"),
    )


class CompetitorGoldPrice(Base):
    """
    Gold prices per client/source/karat.
    Matches Alembic table: competitor_gold_prices
    """

    __tablename__ = "competitor_gold_prices"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    date = Column(DateTime, nullable=False)
    karat = Column(Integer, nullable=False)
    price_per_gram = Column(Float, nullable=False)
    currency = Column(String, default="KWD")
    source = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client")

    __table_args__ = (
        UniqueConstraint("client_id", "date", "karat", "source", name="uq_gold_price"),
    )


class CompetitorBrandOffer(Base):
    """
    Brand offers/promotions scraped from various sources.
    Matches Alembic table: competitor_brand_offers
    """

    __tablename__ = "competitor_brand_offers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    brand = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    discount_percentage = Column(Float, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    source = Column(String, nullable=False)  # website, instagram, tiktok, snapchat, etc.
    source_url = Column(String, nullable=False)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    client = relationship("Client", back_populates="competitor_brand_offers")

    __table_args__ = (
        Index("ix_brand_offers_brand", "brand"),
        Index("ix_brand_offers_active", "is_active"),
        Index("ix_brand_offers_scraped_at", "scraped_at"),
    )


class CompetitorWebsiteAccount(Base):
    """
    Website accounts to monitor for competitor analysis.
    Matches Alembic table: competitor_website_accounts
    """

    __tablename__ = "competitor_website_accounts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    website_url = Column(String, nullable=False)
    brand_name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # local, international
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_website_accounts")

    __table_args__ = (
        UniqueConstraint("client_id", "website_url", name="uq_website_url"),
    )


class CompetitorBusinessConfig(Base):
    """
    Business configuration for competitor analysis (business type, keywords, etc.).
    Matches Alembic table: competitor_business_config
    """

    __tablename__ = "competitor_business_config"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    business_type = Column(String, nullable=False)  # Gold, Jewelleries, Watches, etc.
    keywords = Column(Text, nullable=False)  # Comma-separated
    price_keywords = Column(Text, nullable=True)  # Comma-separated
    offer_keywords = Column(Text, nullable=True)  # Comma-separated
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_business_configs")

    __table_args__ = (
        UniqueConstraint("client_id", "business_type", name="uq_client_business_type"),
    )


class CompetitorNewsSource(Base):
    """
    News sources for gold/news scraping.
    Matches Alembic table: competitor_news_sources
    """

    __tablename__ = "competitor_news_sources"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    source_name = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    region = Column(String, nullable=True)  # local, international, null
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    auto_categorize = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_news_sources")

    __table_args__ = (
        UniqueConstraint("client_id", "source_url", name="uq_news_source"),
    )


class CompetitorGoldNews(Base):
    """
    Gold/news articles scraped from various sources.
    Matches Alembic table: competitor_news
    """

    __tablename__ = "competitor_news"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    published_at = Column(DateTime, nullable=False)
    region = Column(String, nullable=False)  # local, international
    category = Column(String, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_news")

    __table_args__ = (
        UniqueConstraint("client_id", "source_url", "published_at", name="uq_news"),
        Index("ix_news_date", "published_at"),
        Index("ix_news_region", "region"),
    )


class CompetitorDailyNewsSummary(Base):
    """
    Daily news summaries generated by AI.
    Matches Alembic table: competitor_daily_news_summaries
    """

    __tablename__ = "competitor_daily_news_summaries"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    date = Column(DateTime, nullable=False)
    summary = Column(Text, nullable=False)
    expert_opinion = Column(Text, nullable=True)
    expectations = Column(Text, nullable=True)
    key_points = Column(JSONB, nullable=True)  # Array of strings
    news_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_daily_news_summaries")

    __table_args__ = (
        UniqueConstraint("client_id", "date", name="uq_daily_summary"),
    )


class CompetitorDeepResearchResult(Base):
    """
    Deep research results from AI-powered brand research.
    Matches Alembic table: competitor_deep_research
    """

    __tablename__ = "competitor_deep_research"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    brand_name = Column(String, nullable=False)
    research_query = Column(Text, nullable=False)
    research_result = Column(Text, nullable=False)
    extracted_info = Column(JSONB, nullable=True)
    citations = Column(JSONB, nullable=True)
    search_queries = Column(JSONB, nullable=True)
    interaction_id = Column(String, nullable=True)
    status = Column(String, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_deep_research")

    __table_args__ = (
        Index("ix_deep_research_brand", "brand_name"),
        Index("ix_deep_research_date", "created_at"),
    )


class CompetitorAnalyzedImage(Base):
    """
    Images analyzed by AI for promotional content.
    Matches Alembic table: competitor_analyzed_images
    """

    __tablename__ = "competitor_analyzed_images"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    brand_name = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    source = Column(String, nullable=False)  # instagram, website, snapchat, tiktok
    source_url = Column(String, nullable=False)
    analysis_result = Column(Text, nullable=False)
    extracted_info = Column(JSONB, nullable=True)
    is_promotional = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_analyzed_images")

    __table_args__ = (
        Index("ix_analyzed_images_brand", "brand_name"),
        Index("ix_analyzed_images_source", "source"),
    )


class CompetitorTikTokHashtag(Base):
    """
    TikTok hashtags for business types.
    Matches Alembic table: competitor_tiktok_hashtags
    """

    __tablename__ = "competitor_tiktok_hashtags"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    business_type = Column(String, nullable=False)
    hashtags = Column(JSONB, nullable=False)  # Array of hashtag strings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_tiktok_hashtags")

    __table_args__ = (
        UniqueConstraint("client_id", "business_type", name="uq_tiktok_hashtags"),
    )


class CompetitorPriceAlert(Base):
    """
    Price alerts for gold prices.
    Matches Alembic table: competitor_price_alerts
    """

    __tablename__ = "competitor_price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    karat = Column(Integer, nullable=False)
    threshold_percentage = Column(Float, nullable=False)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_price_alerts")


class CompetitorOfferSuggestion(Base):
    """
    AI-generated offer suggestions stored for one month.
    Matches Alembic table: competitor_offer_suggestions
    """

    __tablename__ = "competitor_offer_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    business_type = Column(String, nullable=False)
    suggestions = Column(JSONB, nullable=False)  # Array of suggestion objects
    market_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="competitor_offer_suggestions")

    __table_args__ = (
        Index("ix_offer_suggestions_client_date", "client_id", "created_at"),
        Index("ix_offer_suggestions_date", "created_at"),
    )

