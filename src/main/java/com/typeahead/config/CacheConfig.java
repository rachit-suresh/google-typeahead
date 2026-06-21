package com.typeahead.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "typeahead.cache")
@Getter
@Setter
public class CacheConfig {
    private int ttlSeconds = 300;
    private List<RedisNodeConfig> nodes = new ArrayList<>();

    @Getter
    @Setter
    public static class RedisNodeConfig {
        private String name;
        private String host;
        private int port;
    }
}
