import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from the parent or current directory
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_NAME = os.getenv("DB_NAME", "typeahead_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

print("Connecting to PostgreSQL database...")
try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM search_queries;")
    count = cur.fetchone()[0]
    print(f"Connection Successful!")
    print(f"Total search queries in 'search_queries' table: {count}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Database connection failed: {e}")
