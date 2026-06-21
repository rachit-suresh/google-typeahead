# Search Typeahead System

A high-performance prefix suggestion and search typeahead system built with Spring Boot, Java 25, and PostgreSQL.

## Getting Started

### 1. Database Setup
Ensure PostgreSQL is running locally.

1. Connect to PostgreSQL and create the target database:
   ```sql
   CREATE DATABASE typeahead_db;
   ```

### 2. Configure Credentials
The actual `application.yml` file is ignored in `.gitignore` to prevent database passwords from being committed to source control.

1. Copy the template configuration file:
   ```bash
   cp src/main/resources/application.yml.template src/main/resources/application.yml
   ```
2. Edit `src/main/resources/application.yml` to specify your PostgreSQL `username` and `password`.

### 3. Load Dataset
Run all cells in [data_loader.ipynb](file:///c:/Users/vangs/cursor/HLD/data_loader.ipynb) to import and aggregate the AOL search queries into Postgres.

### 4. Run the Application
Start the Spring Boot application using your IDE or command line.

The REST API will be available at:
`GET http://localhost:8080/suggest?q=<prefix>`
