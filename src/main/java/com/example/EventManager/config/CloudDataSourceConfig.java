package com.example.EventManager.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Slf4j
public class CloudDataSourceConfig {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/club_management}")
    private String defaultUrl;

    @Value("${spring.datasource.username:postgres}")
    private String defaultUsername;

    @Value("${spring.datasource.password:Girish@9701}")
    private String defaultPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");

        // 1. Support Cloud/Render DATABASE_URL format (postgres:// or postgresql://)
        if (StringUtils.hasText(databaseUrl) &&
                (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
            try {
                log.info("Detected Cloud DATABASE_URL environment variable. Configuring PostgreSQL DataSource...");
                URI uri = new URI(databaseUrl);
                String userInfo = uri.getUserInfo();
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath(); // /dbname

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                if (StringUtils.hasText(uri.getQuery())) {
                    jdbcUrl += "?" + uri.getQuery();
                }

                HikariDataSource dataSource = new HikariDataSource();
                dataSource.setJdbcUrl(jdbcUrl);
                if (StringUtils.hasText(userInfo) && userInfo.contains(":")) {
                    String[] creds = userInfo.split(":", 2);
                    dataSource.setUsername(creds[0]);
                    dataSource.setPassword(creds[1]);
                }
                dataSource.setDriverClassName("org.postgresql.Driver");
                log.info("Successfully initialized Cloud PostgreSQL DataSource for host: {}", host);
                return dataSource;
            } catch (Exception e) {
                log.error("Failed to parse DATABASE_URL: {}. Falling back to default properties.", e.getMessage());
            }
        }

        // 2. Normalize defaultUrl if missing 'jdbc:' prefix
        String url = defaultUrl;
        if (StringUtils.hasText(url) &&
                (url.startsWith("postgres://") || (url.startsWith("postgresql://") && !url.startsWith("jdbc:")))) {
            url = "jdbc:" + url;
        }

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(defaultUsername);
        dataSource.setPassword(defaultPassword);
        dataSource.setDriverClassName("org.postgresql.Driver");
        return dataSource;
    }
}
