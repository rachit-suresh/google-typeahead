# Search Typeahead System

A high-performance prefix suggestion and search typeahead system built with Spring Boot, Java 25, Node.js, and React, fully containerized using Docker Compose.

---

## System Overview & Architecture

The application is composed of 7 services connected via an internal Docker network:

*   **`frontend-client`** (`localhost:5173`): Vite React application providing a retro desktop interface and a real-time Cache Ring Monitor.
*   **`search-microservice`** (`localhost:8081`): Express Node.js gateway that receives searches and forwards updates.
*   **`typeahead-service`** (`localhost:8080`): Core Java 25 service hosting search suggestions, batch writes logic, scoring strategies, and consistent caching lookup.
*   **`typeahead-postgres`** (`localhost:5433` on host, `5432` internally): PostgreSQL 17 database storing persistent search queries.
*   **`typeahead-redis-1/2/3`** (`localhost:6379/6380/6381`): Distributed caching nodes partitioned via Ketama MD5 consistent hashing.

---

## Getting Started (Docker Compose)

### 1. Build the Java Backend Package
Before building the container images, compile and package the Java Spring Boot JAR:
```bash
mvn clean package -DskipTests
```

### 2. Launch the Application Stack
Build and start all 7 containers in detached mode:
```bash
docker compose up --build -d
```

Verify that all services are active:
```bash
docker compose ps
```

---

## Database Schema & Initial Data Loading

### 1. Database Port Configuration
To avoid conflicts with host PostgreSQL installations, the containerized database is exposed on **host port `5433`**.
Ensure your host `.env` file matches:
```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=typeahead_db
DB_USER=postgres
DB_PASSWORD=<your_secure_password>
```

### 2. Automatic Data Loading (AOL Dataset)
The dataset is **automatically loaded on startup** by the `database-loader` Docker container using the `data_loader.py` script.
- **Auto-detection**: The script automatically checks if the `search_queries` table is already populated. If records exist, it skips the Kaggle download and data aggregation to avoid duplication.
- **Manual Reload**: If you ever need to run the loading process manually from your host machine, you can run:
  ```bash
  .\.venv\Scripts\python.exe data_loader.py
  ```

---

## Cache Pre-Warming (Warmup) Scheduler

To eliminate cold-start latency and avoid cache stampedes on database query patterns, a background Cache Warmup Scheduler is built directly into the Spring Boot Java backend (`CacheWarmupScheduler`).

*   **Trigger**: Fires automatically on application startup, and runs periodically on a configured schedule (default: every 5 minutes / `300000` ms).
*   **High-Performance Execution**:
    1.  Fetches the top 100,000 most popular queries globally from the database (calculated using the time-decayed scoring strategy weights).
    2.  Generates prefix suggestion lists in-memory for all prefix lengths up to 10 characters.
    3.  Groups the generated suggestion payloads by Redis sharded node using Consistent Hashing (Ketama).
    4.  Flushes the prefix-to-suggestion mapping to all Redis cluster nodes in bulk using high-performance pipelined writes (`putAllPipelined`).
*   **Performance**: Pre-warms ~300,000 cache keys in under 5 seconds (typically ~4.7 seconds), ensuring 100% of the typical query distribution is available in Redis before requests arrive.

### Configuration Properties
You can customize the scheduler behavior in `src/main/resources/application.yml` under `typeahead.cache.warmup`:

```yaml
typeahead:
  cache:
    warmup:
      enabled: true            # Enable/disable the pre-warming scheduler
      top-queries-limit: 10000 # Number of popular queries to process
      fixed-rate-ms: 300000    # Interval rate in milliseconds between runs
```

---

## Verifying & Benchmarking System Components

A set of verification scripts is provided in the `scripts/` directory of your workspace to test components on the host:

*   **Database Upsert Check**:
    ```bash
    python scripts/check_postgres.py
    ```
*   **Batch Write Buffer & Eviction Validation**:
    ```bash
    python scripts/verify_batch_write.py
    ```
*   **Write Latency & Throughput Benchmark**:
    ```bash
    python scripts/benchmark_writes.py
    ```


<img width="2878" height="1730" alt="image" src="https://github.com/user-attachments/assets/434dc32f-2f4b-4235-96b6-57b3e847b107" />


<img width="2873" height="1716" alt="image" src="https://github.com/user-attachments/assets/740d8c39-b26a-43d2-8c5c-70f2caae5e7c" />




