package com.healthid.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Shared utility for writing JSON error responses with the standard
 * {@code {timestamp, status, message}} shape used across both the
 * {@code GlobalExceptionHandler} and Spring Security entry-point / access-denied handlers.
 */
public final class SecurityErrorResponseWriter {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private SecurityErrorResponseWriter() {
        // utility class — not instantiable
    }

    /**
     * Build a standardised error body map matching the shape produced by
     * {@code GlobalExceptionHandler.error()}.
     */
    public static Map<String, Object> buildErrorBody(int status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("message", message);
        return body;
    }

    /**
     * Write a JSON error response directly to the servlet response.
     * Used by Spring Security's {@code AuthenticationEntryPoint} and
     * {@code AccessDeniedHandler} which operate outside the controller layer.
     */
    public static void writeErrorResponse(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        OBJECT_MAPPER.writeValue(response.getOutputStream(), buildErrorBody(status, message));
    }
}
