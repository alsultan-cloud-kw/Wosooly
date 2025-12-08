from pydantic import BaseModel, Field
from typing import Optional,List, Dict
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    client_name: Optional[str] = None
    company_details: Optional[str] =None
    store_url: Optional[str] = None
    consumer_key: Optional[str] = None
    consumer_secret: Optional[str] = None
    accepted_terms: bool = Field(..., description="User must accept terms and privacy policy")
    plan: Optional[str] = None

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
    product_id: Optional[int]
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
    product_id: Optional[int]
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

class ModelFieldsResponse(BaseModel):
    customer: List[ModelFieldDefinition]
    order: List[ModelFieldDefinition]
    product: List[ModelFieldDefinition] 