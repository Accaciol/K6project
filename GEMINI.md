# Project: K6 Performance Testing with Oracle DB

## Project Overview
This project is a performance testing suite designed to measure and analyze the performance of an Oracle Database under various load conditions. It uses **k6** (a modern load testing tool) with a custom build to support SQL connections via the `xk6-sql` extension and the Oracle driver.

### Technologies
- **k6**: Load testing tool.
- **Oracle Database (Express Edition)**: The target system for performance testing.
- **Podman & Podman Compose**: Orchestrates the testing environment (Docker-compatible).
- **xk6**: Used to build a custom k6 binary with SQL and Oracle driver support.
- **JavaScript**: Scripting language for k6 test definitions.

### Architecture
The project is containerized using Podman Compose:
- **`oracle-db`**: Runs the Oracle Database.
- **`k6`**: A custom-built k6 container that waits for the database to be healthy.

## Building and Running

### Prerequisites
- Podman and Podman Compose installed.
- (Optional) `alias docker=podman` for convenience.

### Commands
- **Start the environment and run tests:**
  ```bash
  podman-compose up --build
  ```
  This command builds the custom k6 image, starts the Oracle DB, and triggers the performance test.

- **Stop and remove containers:**
  ```bash
  podman-compose down
  ```

- **View results:**
  After the test finishes, a visual HTML report is generated at `results/summary.html`. Open this file in any web browser.

## Development Conventions

### Project Structure
- `scripts/`: Contains the k6 performance test scripts (e.g., `performance-test.js`).
- `docker/`: Contains the `Dockerfile` for the custom k6 build.
- `docs/`: Detailed documentation about Docker setup, performance test logic, and result analysis.
  - `docs/DOCKER_EXPLAINED.md`: Explains the containerized environment.
  - `docs/PERFORMANCE_TEST_EXPLAINED.md`: Details the k6 test logic.
  - `docs/ANALYZING_RESULTS.md`: Guide for interpreting test metrics and reports.
  - `docs/NATIVE_EXECUTION.md`: Instructions for running k6 without Docker/Podman on Linux and Windows, and testing remote databases.
- `results/`: Output directory for test summaries and reports.

### Test Lifecycle
The k6 script (`scripts/performance-test.js`) follows the standard k6 lifecycle:
1. **`setup()`**: Initializes the database by creating tables (`test_categories`, `test_performance`) and indexes.
2. **`default` function**: Executed by Virtual Users (VUs). Simulates random data insertion and querying to bypass database caching.
3. **`teardown()`**: Cleans up or closes connections after testing.
4. **`handleSummary()`**: Processes test metrics into a visual HTML report.

### Coding Style
- Scripts use ES6 module syntax (`import`/`export`).
- Environment variables (like `DB_URL`) are used for configuration.
- Custom metrics (e.g., `db_errors` counter) are used to track database-specific failures.

### Performance Scenarios
The project implements three main scenarios in `performance-test.js`:
- **Stress Test**: Gradually increases load to find the system's breaking point.
- **Spike Test**: Simulates sudden surges in traffic.
- **Soak Test**: Checks for stability and memory leaks over a longer duration.
