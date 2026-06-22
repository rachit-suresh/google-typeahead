import os
import time
import requests
from concurrent.futures import ThreadPoolExecutor

BACKEND_URL = "http://localhost:8080/typeahead/record"
CONCURRENCY = 10
TOTAL_REQUESTS = 200

def send_request(idx):
    query = f"benchmark_query_{idx}_{int(time.time())}"
    start = time.perf_counter()
    try:
        response = requests.post(BACKEND_URL, json={"query": query}, timeout=5)
        latency = (time.perf_counter() - start) * 1000
        return response.status_code == 200, latency
    except Exception:
        return False, 0.0

def run_benchmark():
    print(f"Starting Write Latency & Throughput Benchmark...")
    print(f"Sending {TOTAL_REQUESTS} requests with concurrency of {CONCURRENCY} workers...")

    start_time = time.perf_counter()
    latencies = []
    success_count = 0

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        results = list(executor.map(send_request, range(TOTAL_REQUESTS)))

    elapsed = time.perf_counter() - start_time

    for success, latency in results:
        if success:
            success_count += 1
            latencies.append(latency)

    if not latencies:
        print("All requests failed. Benchmark incomplete.")
        return

    avg_latency = sum(latencies) / len(latencies)
    min_latency = min(latencies)
    max_latency = max(latencies)
    throughput = success_count / elapsed

    print("\n--- BENCHMARK RESULTS ---")
    print(f"Total Requests: {TOTAL_REQUESTS}")
    print(f"Successful Requests: {success_count} ({success_count/TOTAL_REQUESTS*100:.1f}%)")
    print(f"Total Elapsed Time: {elapsed:.2f} seconds")
    print(f"Throughput: {throughput:.2f} requests/sec")
    print(f"Average Latency: {avg_latency:.2f} ms")
    print(f"Min Latency: {min_latency:.2f} ms")
    print(f"Max Latency: {max_latency:.2f} ms")

if __name__ == "__main__":
    run_benchmark()
