# Redis Distributed Cache & Consistent Hashing System Documentation

This document explains the architecture, setup, code modifications, and design choices made to implement the distributed caching layer with consistent hashing in our search typeahead system.

---

## 1. How This Redis Setup Works & Why the `redis` Folder Exists

### Standalone Redis Nodes on Windows
In a standard production environment, developers run Redis inside Linux containers (via Docker/Kubernetes) or use cloud-managed services (like AWS ElastiCache). Because Docker is not active or accessible on this local environment, the system utilizes a **standalone multi-instance local architecture** located in the [redis/](file:///c:/Users/vangs/cursor/HLD/redis) folder.

* **What is in the `redis/` folder?**
  It contains precompiled Windows binaries for Redis 3.x (from the MSOpenTech Microsoft port, since Redis officially does not support Windows).
  * `redis-server.exe`: The primary Redis database server executable.
  * `redis-cli.exe`: The command-line client used to run queries, monitor commands, and inspect cache state.
  * `redis.windows.conf`: Configuration file defining memory limits, persistence (AOF/RDB), and networking constraints.

* **Multi-Instance Simulation:**
  To simulate a real-world distributed cache cluster, we launch three separate processes on different local ports:
  1. **Node 1**: `localhost:6379`
  2. **Node 2**: `localhost:6380`
  3. **Node 3**: `localhost:6381`

Each node runs in isolation, maintaining its own separate in-memory keyspace.

---

## 2. Why Client-Side Consistent Hashing is Used

### Why Doesn't Redis Support Consistent Hashing Automatically?
A standalone Redis instance is a simple, high-performance, single-threaded in-memory key-value store. It has **no awareness of other Redis instances** in your network. It simply receives command packets, stores/retrieves values, and responds. 

Redis *does* support **Redis Cluster**, which shards data automatically using gossip protocols and 16,384 "hash slots." However:
1. Setting up a Redis Cluster requires complex clustering commands, cluster state file management, and coordinate handshakes.
2. Setting up a native Redis Cluster on raw Windows binaries is extremely fragile and error-prone.
3. In many enterprise scenarios (e.g., legacy systems or microservice topologies), client-side hashing or a proxy layer (like Netflix's Dynomite or Twitter's Twemproxy) is preferred to avoid the clustering overhead of Redis.

### The Modulo Sharding Problem
If we have 3 nodes, the simplest way to route keys is:
$$\text{Node Index} = \text{Hash}(key) \pmod 3$$
* If Node 3 goes down (leaving 2 nodes), the formula changes to $\text{Hash}(key) \pmod 2$.
* Almost **every single key** will now map to a different node.
* This triggers a **99% cache invalidation rate**, creating a **Cache Stampede** where all requests fallback to the database simultaneously, instantly crashing PostgreSQL.

### Consistent Hashing to the Rescue
Consistent Hashing maps both **nodes** and **keys** onto a circular virtual ring (from $0$ to $2^{32}-1$) using the **Ketama algorithm**:

1. **Virtual Nodes (VNodes)**: To prevent uneven key distribution (hotspots), each physical node is cloned 100 times as "Virtual Nodes" (e.g., `Redis-Node-1:6379-VN0` to `VN99`) and placed randomly along the ring.
2. **Key Placement**: The key (e.g., `suggest:lit`) is hashed, and we traverse the ring **clockwise** until we hit the first virtual node. We then route the request to that node's physical server.
3. **Failover**: If a node fails, only its virtual nodes are removed. Only keys mapping directly to those VNodes migrate clockwise to the next available node. **Only $1/N$ (33% for 3 nodes) of the keys are invalidated**, shielding the database.

---

## 3. Code Modifications & Excerpts

### A. Configuring the Cluster ([`application.yml`](file:///c:/Users/vangs/cursor/HLD/src/main/resources/application.yml))
We configure the TTL and list of active nodes in our configuration file:
```yaml
typeahead:
  suggestion:
    limit: 10
  cache:
    ttl-seconds: 300
    nodes:
      - name: "Redis-Node-1"
        host: "localhost"
        port: 6379
      - name: "Redis-Node-2"
        host: "localhost"
        port: 6380
      - name: "Redis-Node-3"
        host: "localhost"
        port: 6381
```

### B. Defining the Consistent Hash Ring ([`ConsistentHashRing.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/cache/ConsistentHashRing.java))
We use a `java.util.TreeMap` (which maintains elements in sorted order) to represent the circular ring:
```java
public String getNode(String key) {
    if (ring.isEmpty()) return null;
    long hash = calculateHash(key);
    if (!ring.containsKey(hash)) {
        // tailMap returns a view of the map containing keys >= hash
        SortedMap<Long, String> tailMap = ring.tailMap(hash);
        // If empty, wrap around to the first key on the ring
        hash = tailMap.isEmpty() ? ring.firstKey() : tailMap.firstKey();
    }
    return ring.get(hash);
}

public long calculateHash(String key) {
    try {
        MessageDigest md = MessageDigest.getInstance("MD5");
        md.update(key.getBytes());
        byte[] digest = md.digest();
        // Convert first 4 bytes of MD5 digest to an unsigned 32-bit integer
        long hash = ((long) (digest[3] & 0xFF) << 24)
                | ((long) (digest[2] & 0xFF) << 16)
                | ((long) (digest[1] & 0xFF) << 8)
                | ((long) (digest[0] & 0xFF));
        return hash & 0xFFFFFFFFL;
    } catch (NoSuchAlgorithmException e) {
        throw new RuntimeException("MD5 not available", e);
    }
}
```

### C. The Distributed Cache Service ([`RedisCacheService.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/cache/RedisCacheService.java))
Manages separate Jedis connection pools for each node:
```java
public String get(String key) {
    String nodeName = hashRing.getNode(key);
    JedisPool pool = pools.get(nodeName);
    try (Jedis jedis = pool.getResource()) {
        String value = jedis.get(key);
        if (value != null) incrementHits();
        else incrementMisses();
        return value;
    } catch (Exception e) {
        incrementMisses();
        return null;
    }
}
```

### D. Suggestion Routing & Eviction ([`SuggestionService.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/service/SuggestionService.java))
Implements **Cache-Aside** reading and **Write-Through** eviction:
```java
public List<SuggestionResponse> getSuggestions(String prefix) {
    String cacheKey = "suggest:" + prefix.trim().toLowerCase();
    
    // 1. Try reading from Consistent Hash Ring
    String cached = cacheService.get(cacheKey);
    if (cached != null) {
        return objectMapper.readValue(cached, new TypeReference<List<SuggestionResponse>>() {});
    }
    
    // 2. Cache Miss: read from PostgreSQL
    List<SuggestionResponse> suggestions = repository.findTopByPrefix(prefix, PageRequest.of(0, limit));
    
    // 3. Write back to the assigned cache node
    cacheService.put(cacheKey, objectMapper.writeValueAsString(suggestions));
    return suggestions;
}

public void recordSearch(String query) {
    String normalized = query.trim().toLowerCase();
    repository.upsertQuery(normalized);
    
    // Evict all prefix caches to prevent stale data
    for (int i = 1; i <= normalized.length(); i++) {
        String prefix = normalized.substring(0, i);
        cacheService.evict("suggest:" + prefix);
    }
}
```

---

## 4. Industry Standard Practices: What We Did vs. Enterprise Scale

In tech companies, caching at scale builds on these fundamentals but introduces higher-tier infrastructure:

| Feature | Our Simulating Environment | Large-Scale Enterprise Approach (Google, Netflix, etc.) |
| :--- | :--- | :--- |
| **Topology** | **Client-Side Hashing**: App code directly manages TreeMap and connections to 3 nodes. | **Proxy Sharding / Sidecars**: Application connects to a sidecar/proxy (e.g., Envoy, Twemproxy) which abstracts the hashing ring. Alternatively, native **Redis Cluster** is used. |
| **High Availability** | No replicas; if Node 1 crashes, the keys on Node 1 are lost until repopulated. | **Master-Replica Replication**: Each partition has a Master node and 1-2 Replica nodes. Sentinel or Kubernetes automatically promotes a replica if the master dies. |
| **Hashing Speed** | MD5 (128-bit hash truncated to 32-bit). | **MurmurHash3 / Ketama**: Murmur3 computes hashes up to 10x faster than MD5 and has superior uniform distribution (less collision potential). |
| **Failover Logic** | Manual routing shift clockwise. | **Automated Sentinel Failover**: Virtual IP mapping or dynamic DNS shifts client pools in real-time. |
| **Eviction Policy** | Simple TTL expiration (300 seconds). | **LRU/LFU memory policies**: Redis instances are configured with `volatile-lru` or `allkeys-lru` with strict `maxmemory` boundaries. |

Our implementation represents a **pure client-side routing model**, replicating how caching clients are engineered when low-latency is critical (bypassing proxies reduces networking overhead by ~1-2ms per query).
