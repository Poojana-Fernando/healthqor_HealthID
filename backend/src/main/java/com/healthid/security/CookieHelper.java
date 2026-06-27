package com.healthid.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieHelper {

    @Value("${app.cookie.secure:false}")
    private boolean secure;

    @Value("${app.cookie.same-site:Lax}")
    private String sameSite;

    public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        addCookie(response, JwtFilter.ACCESS_TOKEN_COOKIE, accessToken, 15 * 60);
        addCookie(response, JwtFilter.REFRESH_TOKEN_COOKIE, refreshToken, 7 * 24 * 60 * 60);
    }

    public void clearAuthCookies(HttpServletResponse response) {
        addCookie(response, JwtFilter.ACCESS_TOKEN_COOKIE, "", 0);
        addCookie(response, JwtFilter.REFRESH_TOKEN_COOKIE, "", 0);
    }

    private void addCookie(HttpServletResponse response, String name, String value, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite(sameSite)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
