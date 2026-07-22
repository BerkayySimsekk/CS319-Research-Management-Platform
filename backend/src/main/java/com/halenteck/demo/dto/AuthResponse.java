package com.halenteck.demo.dto;

import com.halenteck.demo.UserRole;



public record AuthResponse(
        String accessToken,
        Long id,
        String name,
        String email,
        UserRole role
) {

    public String getTokenType() {
        return "Bearer";
    }
}