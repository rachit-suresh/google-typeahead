package com.typeahead.cache;

import com.typeahead.config.CacheConfig;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

@Component
public class ConsistentHashRing {

    private final SortedMap<Long, String> ring = new TreeMap<>();
    private final int numberOfReplicas = 100; // Number of virtual nodes per physical node

    public ConsistentHashRing(CacheConfig cacheConfig) {
        initializeRing(cacheConfig.getNodes());
    }

    private void initializeRing(List<CacheConfig.RedisNodeConfig> nodes) {
        for (CacheConfig.RedisNodeConfig node : nodes) {
            String nodeIdentifier = node.getName() + ":" + node.getPort();
            for (int i = 0; i < numberOfReplicas; i++) {
                String virtualNodeName = nodeIdentifier + "-VN" + i;
                long hash = calculateHash(virtualNodeName);
                ring.put(hash, node.getName());
            }
        }
    }

    public String getNode(String key) {
        if (ring.isEmpty()) {
            return null;
        }
        long hash = calculateHash(key);
        if (!ring.containsKey(hash)) {
            SortedMap<Long, String> tailMap = ring.tailMap(hash);
            hash = tailMap.isEmpty() ? ring.firstKey() : tailMap.firstKey();
        }
        return ring.get(hash);
    }

    public SortedMap<Long, String> getRing() {
        return ring;
    }

    public long calculateHash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(key.getBytes());
            byte[] digest = md.digest();
            // Convert first 4 bytes of MD5 digest to an unsigned 32-bit integer (stored as long)
            long hash = ((long) (digest[3] & 0xFF) << 24)
                    | ((long) (digest[2] & 0xFF) << 16)
                    | ((long) (digest[1] & 0xFF) << 8)
                    | ((long) (digest[0] & 0xFF));
            return hash & 0xFFFFFFFFL; // Force unsigned representation
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }
}
