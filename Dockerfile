# Stage 1: Build the application using Maven
FROM maven:3-eclipse-temurin-25-alpine AS build
WORKDIR /app
COPY pom.xml .
# Pre-fetch dependencies
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Run the application
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app/target/typeahead-system-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

