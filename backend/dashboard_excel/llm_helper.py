import os
import json
from typing import Dict, List, Optional, Tuple
from openai import OpenAI

def infer_columns_with_llm(
    column_names: List[str],
    sample_values: Dict[str, List[str]],
    model: str = "gpt-4o-mini"
) -> Tuple[Optional[str], Optional[str]]:
  """
  Ask LLM to identify the customer and amount columns. Returns (customer_col, amount_col).
  We only send column names + a few sample values (masked).
  """

  client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

  system = (
    "You are helping map tabular column names to two targets: "
    "'customer' (a column holding a person or customer name) and 'amount' (a numeric monetary amount). "
    "Return a JSON object with keys 'customer_column' and 'amount_column', using the exact column names or null."
  )

  # Simple JSON schema pointing the model to select columns
  user_payload = {
    "columns": column_names,
    "samples": sample_values
  }

  resp = client.chat.completions.create(
    model=model,
    response_format={"type": "json_object"},
    messages=[
      {"role": "system", "content": system},
      {"role": "user", "content": json.dumps(user_payload)}
    ],
    temperature=0
  )
  content = resp.choices[0].message.content
  try:
    data = json.loads(content)
  except Exception:
    return None, None

  customer_col = data.get("customer_column")
  amount_col = data.get("amount_column")
  # Validate outputs belong to available columns
  if customer_col not in column_names:
    customer_col = None
  if amount_col not in column_names:
    amount_col = None
  return customer_col, amount_col

def infer_unique_id_column_with_llm(
    column_names: List[str],
    sample_values: Dict[str, List[str]],
    model: str = "gpt-4o-mini"
) -> Optional[str]:
  """
  Ask LLM to identify the best unique identifier column for counting distinct customers.
  Returns the column name or None.
  """

  client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

  system = (
    "You are helping identify the best unique identifier column for counting distinct customers. "
    "Look for columns that uniquely identify customers like phone numbers, emails, customer IDs, etc. "
    "Return a JSON object with key 'unique_id_column', using the exact column name or null."
  )

  user_payload = {
    "columns": column_names,
    "samples": sample_values
  }

  resp = client.chat.completions.create(
    model=model,
    response_format={"type": "json_object"},
    messages=[
      {"role": "system", "content": system},
      {"role": "user", "content": json.dumps(user_payload)}
    ],
    temperature=0
  )
  content = resp.choices[0].message.content
  try:
    data = json.loads(content)
  except Exception:
    return None

  unique_id_col = data.get("unique_id_column")
  # Validate output belongs to available columns
  if unique_id_col not in column_names:
    unique_id_col = None
  return unique_id_col

def infer_product_column_with_llm(column_names, sample_values, model="gpt-4o-mini"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    system = (
        "Identify the best product column (names, items, SKUs, product IDs). "
        "Return JSON: {\"product_column\": <exact column or null>}."
    )
    user_payload = {"columns": column_names, "samples": sample_values}

    resp = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user_payload)},
        ],
        temperature=0,
    )

    try:
        data = json.loads(resp.choices[0].message.content)
    except Exception:
        return None

    col = data.get("product_column")
    return col if col in column_names else None

def infer_customer_fields_with_llm(
    column_names: List[str],
    sample_values: Dict[str, List[str]],
    model: str = "gpt-4o-mini"
) -> Dict[str, Optional[str]]:
  """
  Ask the LLM to map available columns to canonical customer fields.
  Returns a dict mapping these keys to exact column names or None when not found:
  ["name", "civil_id", "phone", "city", "address", "email"]
  """

  client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

  system = (
    "You map messy tabular column names to canonical customer fields. "
    "Possible targets: name (customer full name), civil_id (government ID), "
    "phone (MSISDN), city (city/town), address (street or full address), email. "
    "Only return a JSON object with keys: name, civil_id, phone, city, address, email. "
    "Values must be one of the provided column names or null. Prefer the most specific column if multiple candidates exist."
  )

  user_payload = {
    "columns": column_names,
    "samples": sample_values
  }

  resp = client.chat.completions.create(
    model=model,
    response_format={"type": "json_object"},
    messages=[
      {"role": "system", "content": system},
      {"role": "user", "content": json.dumps(user_payload)}
    ],
    temperature=0
  )

  try:
    data = json.loads(resp.choices[0].message.content)
  except Exception:
    return {"name": None, "civil_id": None, "phone": None, "city": None, "address": None, "email": None}

  # Validate outputs belong to available columns
  result: Dict[str, Optional[str]] = {}
  for key in ["name", "civil_id", "phone", "city", "address", "email"]:
    val = data.get(key)
    result[key] = val if val in column_names else None
  return result

def infer_order_fields_with_llm(
    column_names: List[str], 
    sample_values: Dict[str, List[str]]
) -> Dict[str, str]:
    """
    Use an LLM to infer canonical order fields from arbitrary uploaded file column names.
    Canonical fields: order_id, customer_name, amount, date, status
    """
    prompt = f"""
You are given a list of dataframe columns and sample values.
Map them to the following canonical order fields if possible:
- order_id
- customer_name
- amount
- date
- status

Columns: {column_names}

Sample values per column:
{sample_values}

Return ONLY a valid JSON object where keys are canonical fields
and values are the chosen column name (or null if not found).
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You are a data cleaning assistant."},
                  {"role": "user", "content": prompt}],
        temperature=0,
    )

    # Extract JSON safely
    import json
    try:
        mapping = json.loads(response.choices[0].message.content.strip())
    except Exception:
        mapping = {
            "order_id": None,
            "customer_name": None,
            "amount": None,
            "date": None,
            "status": None,
        }

    return mapping