package com.healthid.service;

import com.healthid.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;

@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final byte[] keyBytes;

    public EncryptionService(@Value("${healthid.encryption.key}") String encryptionKey) {
        if (encryptionKey == null || encryptionKey.isBlank()) {
            throw new BadRequestException("HEALTHID_ENCRYPTION_KEY must be configured");
        }
        this.keyBytes = hexToBytes(encryptionKey);
        if (this.keyBytes.length != 32) {
            throw new BadRequestException("HEALTHID_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
        }
    }

    public byte[] encrypt(String plaintext) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] cipherText = cipher.doFinal(plaintext.getBytes());
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherText.length);
            buffer.put(iv);
            buffer.put(cipherText);
            return buffer.array();
        } catch (Exception e) {
            throw new BadRequestException("Encryption failed");
        }
    }

    public String decrypt(byte[] encrypted) {
        try {
            ByteBuffer buffer = ByteBuffer.wrap(encrypted);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);
            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(cipherText));
        } catch (Exception e) {
            throw new BadRequestException("Decryption failed");
        }
    }

    public byte[] encryptNationalId(String nationalId) {
        return encrypt(nationalId);
    }

    public String decryptNationalId(byte[] encrypted) {
        return decrypt(encrypted);
    }

    public static String sha256Prefix(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 4; i++) {
                hex.append(String.format("%02X", hash[i]));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new BadRequestException("Hash generation failed");
        }
    }

    private static byte[] hexToBytes(String hex) {
        String normalized = hex.trim();
        if (normalized.length() % 2 != 0) {
            throw new BadRequestException("Invalid hex key length");
        }
        byte[] bytes = new byte[normalized.length() / 2];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) Integer.parseInt(normalized.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }
}
