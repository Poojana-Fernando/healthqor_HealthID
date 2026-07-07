package com.healthid.dto.support;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SupportTicketSubmitRequest {

    @NotBlank(message = "Name cannot be blank")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Subject cannot be blank")
    @Size(max = 200)
    private String subject;

    @NotBlank(message = "Category cannot be blank")
    private String category;

    @NotBlank(message = "Priority cannot be blank")
    private String priority;

    @NotBlank(message = "Message cannot be blank")
    @Size(max = 5000)
    private String message;
}
