package com.healthid.dto.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class ChatRequest {

    @NotBlank
    private String message;

    private List<ChatMessageDto> history;
}
