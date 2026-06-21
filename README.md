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
DB_PASSWORD=18112006
```

### 2. Loading the AOL Dataset
The table schema is automatically initialized on startup by the backend (`ddl-auto: update`).
To import the AOL Search logs dataset:
1. Activate your virtual environment and run the Jupyter notebook:
   ```bash
   .\.venv\Scripts\activate
   jupyter notebook
   ```
2. Open and run all cells in [data_loader.ipynb](file:///c:/Users/vangs/cursor/HLD/data_loader.ipynb). It will pull, aggregate, and bulk insert data into the containerized database on port `5433`.

---

## Verifying & Benchmarking System Components

A set of verification scripts is provided in the brain scratch area of your workspace to test components on the host:

*   **Database Upsert Check**:
    ```bash
    python .gemini/antigravity-ide/brain/a98ba661-7819-47e6-ada7-9dd23b3adc12/scratch/check_postgres.py
    ```
*   **Batch Write Buffer & Eviction Validation**:
    ```bash
    python .gemini/antigravity-ide/brain/a98ba661-7819-47e6-ada7-9dd23b3adc12/scratch/verify_batch_write.py
    ```
*   **Write Latency & Throughput Benchmark**:
    ```bash
    python .gemini/antigravity-ide/brain/a98ba661-7819-47e6-ada7-9dd23b3adc12/scratch/benchmark_writes.py
    ```
