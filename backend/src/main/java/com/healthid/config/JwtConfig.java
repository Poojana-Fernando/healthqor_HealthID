package com.healthid.config;

import com.healthid.security.JwtUtil;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {
    // JwtUtil is component-scanned; this config class anchors JWT-related beans.
    public JwtConfig(JwtUtil jwtUtil) {
    }
}
