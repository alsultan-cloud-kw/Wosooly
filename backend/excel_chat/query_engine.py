"""
Excel Chat Query Engine
Converts natural language queries to pandas operations on Excel data
"""
import os
import json
import pandas as pd
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from models import UploadedFile, ColumnMapping, FileRow, Client
from openai import OpenAI
import re

class ExcelQueryEngine:
    def __init__(self, db: Session, client: Client, file_id: Optional[int] = None):
        self.db = db
        self.client = client
        self.file_id = file_id
        self.df = None
        self.mapping = None
        self.target_file = None
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    def load_excel_data(self) -> bool:
        """Load Excel data into DataFrame using existing patterns"""
        client_id = self.client.id
        
        # Determine target file
        base = self.db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
        
        if self.file_id:
            self.target_file = base.filter(UploadedFile.id == self.file_id).first()
            if not self.target_file:
                return False
        else:
            self.target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
        
        if not self.target_file:
            return False
        
        # Get column mapping
        mapping_obj = (
            self.db.query(ColumnMapping)
            .filter(
                ColumnMapping.client_id == client_id,
                ColumnMapping.file_id == self.target_file.id
            )
            .order_by(ColumnMapping.updated_at.desc())
            .first()
        )
        
        if mapping_obj and mapping_obj.mapping:
            self.mapping = mapping_obj.mapping
        else:
            self.mapping = {}
        
        # Load rows
        rows = self.db.query(FileRow).filter(FileRow.file_id == self.target_file.id).all()
        if not rows:
            return False
        
        # Convert to DataFrame
        records = [r.data for r in rows]
        self.df = pd.DataFrame(records)
        
        if self.df.empty:
            return False
        
        # Clean DataFrame
        self.df.columns = [str(c).strip() for c in self.df.columns]
        self.df = self.df.where(pd.notnull(self.df), None)
        
        return True
    
    def get_dataframe_info(self) -> Dict[str, Any]:
        """Get information about the DataFrame for LLM context"""
        if self.df is None or self.df.empty:
            return {}
        
        # Get column names and sample values
        column_info = {}
        for col in self.df.columns:
            sample_values = self.df[col].dropna().head(5).tolist()
            dtype = str(self.df[col].dtype)
            column_info[col] = {
                "dtype": dtype,
                "sample_values": [str(v) for v in sample_values[:5]],
                "null_count": int(self.df[col].isna().sum()),
                "unique_count": int(self.df[col].nunique())
            }
        
        # Get canonical mappings if available
        canonical_mappings = {}
        if self.mapping:
            # Reverse mapping: canonical -> actual column
            for canonical, actual in self.mapping.items():
                if actual in self.df.columns:
                    canonical_mappings[canonical] = actual
        
        return {
            "columns": column_info,
            "row_count": len(self.df),
            "column_count": len(self.df.columns),
            "canonical_mappings": canonical_mappings,
            "file_name": self.target_file.filename if self.target_file else None
        }
    
    def interpret_query(self, question: str) -> Dict[str, Any]:
        """Use LLM to interpret the natural language query"""
        df_info = self.get_dataframe_info()
        
        if not df_info:
            return {
                "error": "No data available. Please upload an Excel file first.",
                "code": None
            }
        
        # Build prompt for LLM
        system_prompt = """You are a data analysis assistant. Given a pandas DataFrame and a user question, 
generate safe pandas code to answer the question. 

Rules:
1. Use the exact column names from the provided DataFrame
2. Return ONLY valid Python pandas code (no explanations, no markdown)
3. The DataFrame variable is named 'df'
4. Handle missing values appropriately
5. Return results as a DataFrame or Series
6. For aggregations, use descriptive column names
7. Limit results to reasonable sizes (top 10-20 rows unless specified otherwise)
8. Do NOT use eval() or exec() with user input
9. Do NOT access filesystem or make network calls
10. If the query asks for a summary or count, return a single value or small summary

The code should be a single expression or a few lines that can be executed safely."""

        # Build column summary for LLM
        column_summary = []
        for col_name, col_info in df_info['columns'].items():
            summary = f"- {col_name} ({col_info['dtype']}): {col_info['unique_count']} unique values"
            if col_info['sample_values']:
                samples = ', '.join(col_info['sample_values'][:3])
                summary += f", samples: {samples}"
            column_summary.append(summary)
        
        user_prompt = f"""You have a pandas DataFrame named 'df' with the following structure:

Rows: {df_info['row_count']}
Columns ({df_info['column_count']}):
{chr(10).join(column_summary)}

Canonical Mappings (if available):
{json.dumps(df_info['canonical_mappings'], indent=2) if df_info['canonical_mappings'] else 'None'}

User Question: "{question}"

Generate pandas code to answer this question. The code should:
1. Use the DataFrame 'df' that is already loaded
2. Return a result (DataFrame, Series, or scalar value)
3. Be safe and efficient
4. Handle missing values appropriately

Return ONLY the Python code, no markdown, no explanations."""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            code = response.choices[0].message.content.strip()
            
            # Clean code (remove markdown code blocks if present)
            code = re.sub(r'```python\n?', '', code)
            code = re.sub(r'```\n?', '', code)
            code = code.strip()
            
            return {
                "code": code,
                "error": None
            }
        except Exception as e:
            return {
                "error": f"Failed to interpret query: {str(e)}",
                "code": None
            }
    
    def execute_query(self, code: str) -> Dict[str, Any]:
        """Safely execute pandas code on the DataFrame"""
        if self.df is None or self.df.empty:
            return {
                "error": "No data available",
                "result": None
            }
        
        # Security: Only allow safe operations
        # Block dangerous operations
        dangerous_patterns = [
            r'__import__',
            r'eval\(',
            r'exec\(',
            r'open\(',
            r'file\(',
            r'input\(',
            r'raw_input\(',
            r'subprocess',
            r'os\.',
            r'sys\.',
            r'import\s+os',
            r'import\s+sys',
            r'import\s+subprocess'
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                return {
                    "error": "Query contains unsafe operations",
                    "result": None
                }
        
        try:
            # Create a safe execution environment
            safe_globals = {
                'pd': pd,
                'df': self.df.copy(),  # Use copy to avoid modifying original
                'len': len,
                'sum': sum,
                'max': max,
                'min': min,
                'abs': abs,
                'round': round,
                'int': int,
                'float': float,
                'str': str,
                'list': list,
                'dict': dict,
                'range': range,
            }
            safe_locals = {}
            
            # Execute the code
            exec(code, safe_globals, safe_locals)
            
            # Try to get result from various possible variable names
            result = None
            for var_name in ['result', 'output', 'data', 'df_result', 'df']:
                if var_name in safe_locals:
                    result = safe_locals[var_name]
                    # If it's the original df, that means code didn't produce a result
                    if var_name == 'df' and result is self.df:
                        result = None
                        continue
                    break
            
            # If no result variable, try to get the last expression
            if result is None:
                # Try to evaluate the last line as an expression
                lines = [line.strip() for line in code.strip().split('\n') if line.strip() and not line.strip().startswith('#')]
                if lines:
                    last_line = lines[-1]
                    try:
                        result = eval(last_line, safe_globals, safe_locals)
                    except:
                        pass
            
            # Convert result to a format we can return
            if result is None:
                return {
                    "error": "Query did not return a result",
                    "result": None
                }
            
            # Convert pandas objects to JSON-serializable format
            if isinstance(result, pd.DataFrame):
                # Limit rows for large results
                if len(result) > 100:
                    result = result.head(100)
                result_data = result.to_dict(orient='records')
                return {
                    "result": result_data,
                    "type": "dataframe",
                    "row_count": len(result),
                    "columns": list(result.columns)
                }
            elif isinstance(result, pd.Series):
                result_data = result.to_dict()
                return {
                    "result": result_data,
                    "type": "series"
                }
            elif isinstance(result, (int, float, str, bool, type(None))):
                return {
                    "result": result,
                    "type": "scalar"
                }
            elif isinstance(result, (list, dict)):
                return {
                    "result": result,
                    "type": type(result).__name__
                }
            else:
                # Try to convert to dict/list
                try:
                    if hasattr(result, 'to_dict'):
                        return {
                            "result": result.to_dict(),
                            "type": type(result).__name__
                        }
                    else:
                        return {
                            "result": str(result),
                            "type": "string"
                        }
                except:
                    return {
                        "result": str(result),
                        "type": "string"
                    }
                    
        except Exception as e:
            return {
                "error": f"Error executing query: {str(e)}",
                "result": None
            }
    
    def generate_explanation(self, question: str, result: Dict[str, Any]) -> str:
        """Generate a natural language explanation of the result"""
        if result.get("error"):
            return f"I couldn't process that query: {result['error']}"
        
        result_type = result.get("type", "unknown")
        result_data = result.get("result")
        
        if result_type == "dataframe":
            row_count = result.get("row_count", 0)
            columns = result.get("columns", [])
            return f"Found {row_count} result(s) with columns: {', '.join(columns)}"
        elif result_type == "series":
            return f"Here's the summary data you requested."
        elif result_type == "scalar":
            return f"The answer is: {result_data}"
        else:
            return "Here are the results:"
    
    def query(self, question: str) -> Dict[str, Any]:
        """Main method to process a natural language query"""
        # Load data if not already loaded
        if self.df is None:
            if not self.load_excel_data():
                return {
                    "error": "No Excel file found. Please upload an Excel file first.",
                    "result": None,
                    "explanation": None,
                    "code": None
                }
        
        # Interpret query
        interpretation = self.interpret_query(question)
        if interpretation.get("error"):
            return {
                "error": interpretation["error"],
                "result": None,
                "explanation": None,
                "code": None
            }
        
        code = interpretation["code"]
        
        # Execute query
        execution_result = self.execute_query(code)
        
        # Generate explanation
        explanation = self.generate_explanation(question, execution_result)
        
        return {
            "error": execution_result.get("error"),
            "result": execution_result.get("result"),
            "explanation": explanation,
            "code": code,
            "type": execution_result.get("type")
        }
