"""
AI-Powered Column Mapping Module
Automatically maps Excel columns to canonical fields using LLM
"""
import os
import json
import pandas as pd
from typing import Dict, List, Optional, Tuple
from openai import OpenAI
from sqlalchemy.orm import Session
from models import UploadedFile, FileRow, FileColumn

class AIColumnMapper:
    """AI-powered column mapper for Excel files"""
    
    def __init__(self, model: str = "gpt-4o-mini"):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model
    
    def extract_column_info(self, db: Session, file_id: int, max_samples: int = 5) -> Dict:
        """
        Extract column information from uploaded file for AI analysis.
        Returns column names, types, sample values, and statistics.
        """
        # Get file
        file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not file:
            return {}
        
        # Get rows
        rows = db.query(FileRow).filter(FileRow.file_id == file_id).limit(100).all()
        if not rows:
            return {}
        
        # Convert to DataFrame
        data = [r.data for r in rows]
        df = pd.DataFrame(data)
        
        if df.empty:
            return {}
        
        # Clean column names
        df.columns = [str(c).strip() for c in df.columns]
        
        column_info = {}
        for col in df.columns:
            # Get sample values (non-null)
            samples = df[col].dropna().head(max_samples).tolist()
            # Convert to strings and limit length
            sample_values = [str(v)[:100] for v in samples[:max_samples]]
            
            # Detect data type
            dtype = str(df[col].dtype)
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                dtype = "datetime"
            elif pd.api.types.is_numeric_dtype(df[col]):
                dtype = "numeric"
            elif pd.api.types.is_bool_dtype(df[col]):
                dtype = "boolean"
            else:
                dtype = "string"
            
            # Detect patterns
            pattern = self._detect_pattern(df[col].dropna().head(20).tolist())
            
            column_info[col] = {
                "name": col,
                "type": dtype,
                "samples": sample_values,
                "null_count": int(df[col].isna().sum()),
                "unique_count": int(df[col].nunique()),
                "pattern": pattern
            }
        
        return {
            "columns": column_info,
            "row_count": len(df),
            "column_count": len(df.columns)
        }
    
    def _detect_pattern(self, values: List) -> Optional[str]:
        """Detect common patterns in column values"""
        if not values:
            return None
        
        sample = str(values[0]) if values else ""
        
        # Email pattern
        if "@" in sample and "." in sample:
            return "email"
        
        # Phone pattern (numbers, +, spaces, dashes)
        if any(c.isdigit() for c in sample) and ("+" in sample or len(sample.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")) >= 7):
            return "phone"
        
        # Date pattern
        if any(char in sample for char in ["-", "/"]) and len(sample) >= 8:
            return "date"
        
        # ID pattern (numeric or alphanumeric)
        if sample.isdigit() or (sample.isalnum() and len(sample) > 5):
            return "id"
        
        return None
    
    def infer_mappings(
        self, 
        column_info: Dict,
        analysis_type: str = "customer"
    ) -> Dict[str, Dict]:
        """
        Infer column mappings for a specific analysis type.
        Returns mapping with confidence scores.
        """
        if not column_info or "columns" not in column_info:
            return {}
        
        # Get canonical fields based on analysis type
        canonical_fields = self._get_canonical_fields(analysis_type)
        
        # Prepare data for LLM
        columns_data = []
        for col_name, col_data in column_info["columns"].items():
            columns_data.append({
                "name": col_data["name"],
                "type": col_data["type"],
                "samples": col_data["samples"][:3],  # Limit to 3 samples
                "pattern": col_data.get("pattern"),
                "unique_count": col_data.get("unique_count", 0)
            })
        
        # Build prompt
        system_prompt = self._build_system_prompt(analysis_type, canonical_fields)
        user_prompt = self._build_user_prompt(columns_data, canonical_fields)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Validate and build response with confidence
            validated_mapping = {}
            for canonical_field in canonical_fields:
                suggested_col = result.get(canonical_field)
                confidence = result.get(f"{canonical_field}_confidence", 0.5)
                
                # Validate column exists
                if suggested_col and suggested_col in column_info["columns"]:
                    validated_mapping[canonical_field] = {
                        "excel_column": suggested_col,
                        "confidence": float(confidence) if isinstance(confidence, (int, float)) else 0.5,
                        "suggested_by": "ai"
                    }
                else:
                    validated_mapping[canonical_field] = {
                        "excel_column": None,
                        "confidence": 0.0,
                        "suggested_by": "ai"
                    }
            
            return validated_mapping
            
        except Exception as e:
            print(f"Error in AI mapping inference: {str(e)}")
            return {}
    
    def _get_canonical_fields(self, analysis_type: str) -> List[str]:
        """Get canonical fields for a specific analysis type"""
        if analysis_type == "customer":
            return [
                "customer_name", "customer_id", "first_name", "last_name",
                "phone", "email", "City", "State", "Country", "address"
            ]
        elif analysis_type == "order":
            return [
                "order_id", "customer_name", "customer_id", "total_amount",
                "created_at", "status", "payment_method", "shipping_address"
            ]
        elif analysis_type == "product":
            return [
                "product_name", "product_id", "quantity", "sales_price",
                "price", "total_amount", "category", "sku"
            ]
        else:
            return []
    
    def _build_system_prompt(self, analysis_type: str, canonical_fields: List[str]) -> str:
        """Build system prompt for LLM"""
        return f"""You are an expert data analyst specializing in mapping Excel column names to standardized canonical fields.

Your task is to map user-provided Excel columns to canonical {analysis_type} fields.

Canonical fields to map to:
{json.dumps(canonical_fields, indent=2)}

Rules:
1. Analyze column names, data types, sample values, and patterns
2. Map each canonical field to the BEST matching Excel column (or null if not found)
3. Consider:
   - Column name similarity (e.g., "Customer Name" → customer_name)
   - Data patterns (phone numbers, emails, dates, IDs)
   - Data types (numeric → amount/price fields)
   - Context clues
4. Provide confidence scores (0.0 to 1.0) for each mapping
5. Return JSON with keys: each canonical field name, and each field name + "_confidence"

Example response format:
{{
  "customer_name": "اسم العميل",
  "customer_name_confidence": 0.95,
  "phone": "رقم الهاتف",
  "phone_confidence": 0.98,
  "customer_id": null,
  "customer_id_confidence": 0.0
}}

Be precise and consider multilingual column names."""
    
    def _build_user_prompt(self, columns_data: List[Dict], canonical_fields: List[str]) -> str:
        """Build user prompt with column information"""
        return f"""Map the following Excel columns to canonical {canonical_fields[0].split('_')[0]} fields:

Available Excel Columns:
{json.dumps(columns_data, indent=2, ensure_ascii=False)}

Return a JSON object mapping each canonical field to an Excel column name (or null), 
along with confidence scores for each mapping."""
    
    def auto_map_file(
        self,
        db: Session,
        file_id: int,
        analysis_types: List[str] = ["customer", "order", "product"]
    ) -> Dict[str, Dict]:
        """
        Automatically map all analysis types for a file.
        Returns mappings for each analysis type with confidence scores.
        """
        # Extract column information
        column_info = self.extract_column_info(db, file_id)
        if not column_info:
            return {}
        
        # Infer mappings for each analysis type
        all_mappings = {}
        for analysis_type in analysis_types:
            mappings = self.infer_mappings(column_info, analysis_type)
            if mappings:
                all_mappings[analysis_type] = mappings
        
        return all_mappings
    
    def format_mappings_for_frontend(
        self,
        ai_mappings: Dict[str, Dict]
    ) -> Dict:
        """
        Format AI mappings for frontend display.
        Returns structure suitable for the column mapping form.
        """
        formatted = {
            "customer": [],
            "order": [],
            "product": []
        }
        
        for analysis_type, mappings in ai_mappings.items():
            for canonical_field, mapping_data in mappings.items():
                if mapping_data.get("excel_column"):
                    formatted[analysis_type].append({
                        "canonical_field": canonical_field,
                        "excel_column": mapping_data["excel_column"],
                        "confidence": mapping_data.get("confidence", 0.5),
                        "suggested_by": "ai"
                    })
        
        return formatted

