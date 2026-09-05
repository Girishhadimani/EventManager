# ============================================================
# Stage 1: Build application using Maven and JDK 21
# ============================================================
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy project definition and source code
COPY pom.xml .
COPY src ./src

# Build production executable JAR (skipping unit tests during packaging)
RUN mvn clean package -DskipTests -B

# ============================================================
# Stage 2: Ultra-lightweight JRE 21 runtime
# ============================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for cloud container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy compiled JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Render injects $PORT at runtime (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# -XX:+UseSerialGC -Xmx350m keeps heap memory compact and prevents Render 512MB free-tier OOM kills
ENTRYPOINT ["sh", "-c", "java -XX:+UseSerialGC -Xmx350m -Xms128m -Dserver.port=${PORT} -jar app.jar"]
