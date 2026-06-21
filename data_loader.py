import os
import glob
import time
from datetime import datetime
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import kagglehub
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "typeahead_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "18112006")

print("--- Starting AOL Search Dataset Loader ---")
print(f"Connecting to database {DB_NAME} on {DB_HOST}:{DB_PORT}...")

# Wait for Postgres connection to be ready
conn_init = None
retries = 20
connected = False

for attempt in range(retries):
    try:
        conn_init = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname="postgres",
            user=DB_USER,
            password=DB_PASSWORD
        )
        connected = True
        print("Successfully connected to PostgreSQL instance!")
        break
    except psycopg2.OperationalError as e:
        print(f"[Attempt {attempt+1}/{retries}] Postgres is not ready yet: {e}")
        time.sleep(3)

if not connected:
    print("Error: Could not connect to PostgreSQL database after multiple retries. Exiting.")
    exit(1)

# Check and create target database if needed
conn_init.autocommit = True
cur_init = conn_init.cursor()
cur_init.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
exists = cur_init.fetchone()
if not exists:
    print(f"Creating target database '{DB_NAME}'...")
    cur_init.execute(f"CREATE DATABASE {DB_NAME}")
else:
    print(f"Database '{DB_NAME}' already exists.")
cur_init.close()
conn_init.close()

# Check target table and count rows
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
conn.autocommit = True
cur = conn.cursor()

# Ensure table exists (in case Hibernate hasn't initialized it yet)
cur.execute("""
    CREATE TABLE IF NOT EXISTS search_queries (
        id BIGSERIAL PRIMARY KEY,
        query VARCHAR(500) NOT NULL UNIQUE,
        day_count BIGINT NOT NULL DEFAULT 0,
        week_count BIGINT NOT NULL DEFAULT 0,
        month_count BIGINT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
""")
cur.execute("CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries (query);")

cur.execute("SELECT COUNT(*) FROM search_queries;")
row_count = cur.fetchone()[0]

if row_count > 0:
    print(f"Database table 'search_queries' already has {row_count} rows.")
    print("Database is populated. Skipping AOL dataset import.")
    cur.close()
    conn.close()
    print("--- Done ---")
    exit(0)

# Table is empty, proceed with download and loading
print("Table is empty. Commencing download of AOL user session collection dataset (500k queries)...")
try:
    path = kagglehub.dataset_download("dineshydv/aol-user-session-collection-500k")
    print("Dataset downloaded successfully to:", path)
except Exception as e:
    print("Failed to download dataset from Kaggle. Make sure Kaggle credentials are set up. Error:", e)
    cur.close()
    conn.close()
    exit(1)

# Read raw log files
all_files = glob.glob(os.path.join(path, "*.txt")) + glob.glob(os.path.join(path, "*.csv")) + glob.glob(os.path.join(path, "*.tsv"))
if not all_files:
    print("Error: No text, CSV, or TSV data files found in the dataset directory.")
    cur.close()
    conn.close()
    exit(1)

dfs = []
for file in all_files:
    print(f"Reading file: {os.path.basename(file)}...")
    try:
        df = pd.read_csv(file, sep='\t', header=0, on_bad_lines='skip', low_memory=False)
        dfs.append(df)
    except Exception as e:
        print(f"Error reading {file}: {e}")

if not dfs:
    print("Error: No data loaded from files.")
    cur.close()
    conn.close()
    exit(1)

combined_df = pd.concat(dfs, ignore_index=True)
combined_df.columns = [c.strip().lower() for c in combined_df.columns]

# Find query column
query_col = None
for col in combined_df.columns:
    if 'query' in col:
        query_col = col
        break

if query_col is None:
    print("Error: Query column not found in dataset!")
    cur.close()
    conn.close()
    exit(1)

print(f"Using column '{query_col}' for queries.")
queries = combined_df[query_col].dropna().astype(str).str.strip().str.lower()
queries = queries[queries != '']

# Aggregate counts
query_counts = queries.value_counts().reset_index()
query_counts.columns = ['query', 'count']
total_records = len(query_counts)

print(f"Aggregated {total_records} unique queries. Preparing batch insertion...")

# Prepare tuples: (query, day_count, week_count, month_count, last_updated)
now = datetime.now()
data_tuples = [(row.query, row.count, row.count, row.count, now) for row in query_counts.itertuples(index=False)]

insert_query = """
    INSERT INTO search_queries (query, day_count, week_count, month_count, last_updated)
    VALUES %s
    ON CONFLICT (query) DO UPDATE
    SET day_count = search_queries.day_count + EXCLUDED.day_count,
        week_count = search_queries.week_count + EXCLUDED.week_count,
        month_count = search_queries.month_count + EXCLUDED.month_count,
        last_updated = EXCLUDED.last_updated
"""

chunk_size = 10000
print(f"Inserting {total_records} rows in chunks of {chunk_size}...")

for i in range(0, total_records, chunk_size):
    chunk = data_tuples[i:i + chunk_size]
    execute_values(cur, insert_query, chunk)
    if (i // chunk_size) % 10 == 0 or (i + chunk_size) >= total_records:
        print(f"Successfully loaded up to index {min(i + chunk_size, total_records)}...")

print("Dataset load complete!")

# Print final verification count
cur.execute("SELECT COUNT(*) FROM search_queries;")
final_count = cur.fetchone()[0]
print(f"Total rows currently in 'search_queries': {final_count}")

cur.close()
conn.close()
print("--- Done ---")
