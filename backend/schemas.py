from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Union, Any
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    phone: str
    password: str
    client_name: Optional[str] = None
    company_details: Optional[str] =None
    store_url: Optional[str] = None
    consumer_key: Optional[str] = None
    consumer_secret: Optional[str] = None
    accepted_terms: bool = Field(..., description="User must accept terms and privacy policy")
    plan: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProductSchema(BaseModel):
    id: int
    external_id: Optional[int]
    name: Optional[str]
    short_description: Optional[str]
    regular_price: Optional[float]
    sales_price: Optional[float]
    total_sales: Optional[int]
    categories: Optional[str]
    stock_status: Optional[str]
    weight: Optional[float]
    date_created: Optional[datetime]
    date_modified: Optional[datetime]
    
    model_config = {
        "from_attributes": True
    }

class TopProduct(BaseModel):
    product_id: Optional[Union[int, str]]  # Can be int or string (product_name fallback)
    product_name: Optional[str]
    total_quantity: Optional[int]

# ✅ Add this model for all products summary
class ProductQuantitySummary(BaseModel):
    product_id: Optional[int]
    product_name: Optional[str]
    total_quantity: Optional[int]

class ProductOrderData(BaseModel):
    date: Optional[str]
    quantity: Optional[int]

class CustomerClassificationResponse(BaseModel):
    customer_id: Optional[int]
    customer_name: Optional[str]
    phone: Optional[str]  
    order_count: Optional[int]
    total_spent: Optional[float]
    last_order_date: Optional[str]
    classification: Optional[str]
    spending_classification: Optional[str]
    churn_risk: Optional[str]
    segment: Optional[str]

class ProductItem(BaseModel):
    product_id: Optional[int]
    product_name: Optional[str]
    product_quantity: Optional[int]
    product_price: Optional[float]
    product_category: Optional[str]
    product_stock_status: Optional[str]
    product_weight: Optional[float]

class OrderDetail(BaseModel):
    order_id: Optional[int]
    external_order_id: Optional[int]
    order_status: Optional[str]
    order_total: Optional[float]
    order_date: Optional[datetime]
    payment_method: Optional[str]
    items: List[ProductItem]

class CustomerInfo(BaseModel):
    customer_id: Optional[int]
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    address_1: Optional[str]
    address_2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postcode: Optional[str]
    country: Optional[str]

class ProductSummary(BaseModel):
    product_id: Optional[Union[int, str]]  # Can be int or string (product_name fallback)
    product_name: Optional[str]
    total_quantity: Optional[int]

class CustomerDetailsResponse(BaseModel):
    customer: CustomerInfo
    orders: List[OrderDetail]
    top_products: List[ProductSummary]
    all_products_summary: List[ProductSummary]

class WhatsAppCredentialsInput(BaseModel):
    phoneNumberId: Optional[str]
    wabaId: Optional[str]
    accessToken: Optional[str]

class InstagramCredentialsInput(BaseModel):
    username: str
    password: Optional[str] = None  # Optional for updates
    email: Optional[str] = None

class WhatsAppTemplateBase(BaseModel):
    template_name: str
    category: str | None = None
    language: str
    status: str
    body: str | None = None
    updated_at: datetime

    class Config:
        orm_mode = True

class SendMessageRequest(BaseModel):
    customers: List[int]
    templates: List[str]
    variables: Optional[Dict[int, List[str]]] = None

class EmailTemplateBase(BaseModel):
    id: int
    template_name: str
    subject: str
    category: Optional[str] = None
    language: Optional[str] = None
    body: str
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class EmailTemplateCreate(BaseModel):
    template_name: str
    subject: str
    category: Optional[str] = None
    language: Optional[str] = None
    body: str
    is_active: bool = True

class EmailTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None
    body: Optional[str] = None
    is_active: Optional[bool] = None

class SendEmailRequest(BaseModel):
    customers: List[int]
    templates: List[str]  # Template names
    subject: Optional[str] = None  # Override template subject if provided
    body: Optional[str] = None  # Override template body if provided
    variables: Optional[Dict[int, List[str]]] = None  # Customer-specific variables
    attachments: Optional[List[str]] = None  # List of file URLs or paths
    data_source: Optional[str] = "woocommerce"  # "woocommerce" or "excel"
    file_id: Optional[int] = None  # Required if data_source is "excel"

class WooCommerceCredentialsRequest(BaseModel):
    store_url: str
    consumer_key: str
    consumer_secret: str

# Column Mapping Schemas
class ColumnMappingRequest(BaseModel):
    file_id: Optional[int] = None  # Optional: None for template/default mappings
    analysis_type: str  # "order", "customer", "product"
    mapping: Dict[str, str]  # {"model_field": "excel_column_name"}

class ColumnMappingResponse(BaseModel):
    id: int
    file_id: Optional[int]
    analysis_type: str
    mapping: Dict[str, str]
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }

class ModelFieldDefinition(BaseModel):
    field_name: str
    field_type: str
    required: bool
    description: str

class AIMappingSuggestion(BaseModel):
    canonical_field: str
    excel_column: Optional[str]
    confidence: float
    suggested_by: str = "ai"

class AIMappingResponse(BaseModel):
    customer: List[AIMappingSuggestion]
    order: List[AIMappingSuggestion]
    product: List[AIMappingSuggestion]
    file_id: int

class ModelFieldsResponse(BaseModel):
    customer: List[ModelFieldDefinition]
    order: List[ModelFieldDefinition]
    product: List[ModelFieldDefinition] 

class AskRequest(BaseModel):
    file_id: int
    question: str

class AdminRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class ClientStatusUpdateRequest(BaseModel):
    is_active: bool

class SelectSubscriptionPlanRequest(BaseModel):
    plan_name: str
    billing_cycle: str = "monthly"  # monthly or yearly


# ------------------------------
# Competitor / Social media schemas (additive)
# ------------------------------

class SocialMediaAccountCreate(BaseModel):
    username: str
    brand_name: str
    platform: str  # "instagram", "tiktok", "snapchat"
    profile_url: str
    is_active: Optional[bool] = True


class SocialMediaAccountSchema(BaseModel):
    id: int
    username: str
    brand_name: str
    platform: str
    profile_url: str
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class InstagramProfileCreate(BaseModel):
    username: str
    brand_name: str
    profile_url: str


class InstagramProfileResponse(BaseModel):
    success: bool
    message: str
    data: Optional[SocialMediaAccountSchema] = None


class GoldPriceSchema(BaseModel):
    id: int
    date: datetime
    karat: int
    price_per_gram: float
    currency: str
    source: str

    model_config = {
        "from_attributes": True,
    }


# Additional Competitor Analysis Schemas
class BrandOfferCreate(BaseModel):
    brand: str
    title: str
    description: Optional[str] = None
    discount_percentage: Optional[float] = None
    valid_until: Optional[datetime] = None
    source: str
    source_url: str


class BrandOfferSchema(BaseModel):
    id: int
    brand: str
    title: str
    description: Optional[str] = None
    discount_percentage: Optional[float] = None
    valid_until: Optional[datetime] = None
    source: str
    source_url: str
    scraped_at: datetime
    is_active: bool

    model_config = {
        "from_attributes": True,
    }


class WebsiteAccountCreate(BaseModel):
    website_url: str
    brand_name: str
    category: str  # local, international
    description: Optional[str] = None
    is_active: Optional[bool] = True


class WebsiteAccountSchema(BaseModel):
    id: int
    website_url: str
    brand_name: str
    category: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class BusinessConfigCreate(BaseModel):
    business_type: str
    keywords: str
    price_keywords: Optional[str] = None
    offer_keywords: Optional[str] = None
    is_active: Optional[bool] = False

class BusinessConfigUpdate(BaseModel):
    keywords: Optional[str] = None
    price_keywords: Optional[str] = None
    offer_keywords: Optional[str] = None
    is_active: Optional[bool] = None

class BusinessConfigSchema(BaseModel):
    id: int
    business_type: str
    keywords: str
    price_keywords: Optional[str] = None
    offer_keywords: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }

class NewsSourceCreate(BaseModel):
    source_name: str
    source_url: str
    region: Optional[str] = None  # local, international
    description: Optional[str] = None
    is_active: Optional[bool] = True
    auto_categorize: Optional[bool] = True

class NewsSourceUpdate(BaseModel):
    source_name: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    auto_categorize: Optional[bool] = None

class NewsSourceSchema(BaseModel):
    id: int
    source_name: str
    source_url: str
    region: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    auto_categorize: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class GoldNewsSchema(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    source: str
    source_url: str
    published_at: datetime
    region: str
    category: Optional[str] = None
    scraped_at: datetime

    model_config = {
        "from_attributes": True,
    }

class DailyNewsSummarySchema(BaseModel):
    id: int
    date: datetime
    summary: str
    expert_opinion: Optional[str] = None
    expectations: Optional[str] = None
    key_points: Optional[List[str]] = None
    news_count: int
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class DeepResearchResultSchema(BaseModel):
    id: int
    brand_name: str
    research_query: str
    research_result: str
    extracted_info: Optional[Dict] = None
    citations: Optional[List] = None
    search_queries: Optional[List] = None
    interaction_id: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class AnalyzedImageSchema(BaseModel):
    id: int
    brand_name: str
    image_url: str
    source: str
    source_url: str
    analysis_result: str
    extracted_info: Optional[Dict] = None
    is_promotional: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class TikTokHashtagSchema(BaseModel):
    id: int
    business_type: str
    hashtags: List[str]
    created_at: datetime
    updated_at: datetime
    model_config = {
        "from_attributes": True,
    }

class PriceAlertSchema(BaseModel):
    id: int
    karat: int
    threshold_percentage: float
    notified: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class GenericResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class EmailRequest(BaseModel):
    subject: str
    body: str
    recipients: List[str]