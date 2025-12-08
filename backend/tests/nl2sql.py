from dotenv import load_dotenv
import os
from pathlib import Path
from nl2sql import NL2SQL

# Load the .env file from the backend folder (parent of tests/)
env_path = Path(__file__).resolve().parents[1] / ".env"

load_dotenv(dotenv_path=env_path)

print("Loaded DATABASE_URL:", os.getenv("DATABASE_URL"))   # debug

# Initialize with your preferred LLM provider
nl2sql = NL2SQL(
    database_url=os.getenv("DATABASE_URL"),
    llm_provider="openai",
    api_key=os.getenv("OPENAI_API_KEY")
)

# Ask a natural language question
result = nl2sql.ask("Show me the top 10 customers by total orders")

print(f"Generated SQL: {result['sql_query']}")
print(f"Results:\n{result['results']}")

# Close connection
nl2sql.close()