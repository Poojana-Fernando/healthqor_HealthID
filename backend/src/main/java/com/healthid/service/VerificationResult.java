package com.healthid.service;

import com.healthid.entity.User;
import com.healthid.entity.VerificationPurpose;

public record VerificationResult(User user, VerificationPurpose purpose) {}
