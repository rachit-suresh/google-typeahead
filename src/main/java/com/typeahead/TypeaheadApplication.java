package com.typeahead;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

@SpringBootApplication
public class TypeaheadApplication {
    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(TypeaheadApplication.class, args);
    }

    private static void loadDotEnv() {
        try {
            if (Files.exists(Paths.get(".env"))) {
                Files.readAllLines(Paths.get(".env")).forEach(line -> {
                    if (line != null && !line.trim().isEmpty() && !line.startsWith("#") && line.contains("=")) {
                        String[] parts = line.split("=", 2);
                        String key = parts[0].trim();
                        String value = parts[1].trim();
                        // Strip surrounding quotes if any
                        if (value.startsWith("\"") && value.endsWith("\"")) {
                            value = value.substring(1, value.length() - 1);
                        }
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                });
            }
        } catch (IOException e) {
            // Ignore if .env can't be read
        }
    }
}
