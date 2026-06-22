import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_NAME = os.getenv("DB_NAME", "typeahead_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

BACKEND_URL = "http://localhost:8080/typeahead/record"

def get_query_count():
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
        cur.close()
        conn.close()
        return count
    except Exception as e:
        print(f"DB Error: {e}")
        return None

def test_batch_write():
    print("Starting Batch Write Verification Test...")
    initial_count = get_query_count()
    if initial_count is None:
        print("Cannot proceed without DB connection.")
        return

    test_query = f"test_query_{int(time.time())}"
    print(f"Sending search record request for: '{test_query}'")
    
    # Send request to backend
    try:
        response = requests.post(BACKEND_URL, json={"query": test_query}, timeout=5)
        print(f"Backend response code: {response.status_code}")
    except Exception as e:
        print(f"Failed to connect to backend: {e}")
        return

    print("Checking database immediately (should be buffered in-memory, count unchanged)...")
    immediate_count = get_query_count()
    print(f"Immediate DB query count: {immediate_count} (Change: {immediate_count - initial_count})")

    print("Waiting 6 seconds for batch flush interval...")
    time.sleep(6)

    print("Checking database again (should be flushed to database, count should increase)...")
    flushed_count = get_query_count()
    print(f"Post-flush DB query count: {flushed_count} (Change: {flushed_count - initial_count})")
    
    # Verify that the test query now exists in the database
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()
        cur.execute("SELECT day_count FROM search_queries WHERE query = %s;", (test_query,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            print(f"SUCCESS: Test query '{test_query}' found in DB with count {row[0]}!")
        else:
            print(f"FAILED: Test query '{test_query}' not found in DB.")
    except Exception as e:
        print(f"Verification query failed: {e}")

if __name__ == "__main__":
    test_batch_write()
