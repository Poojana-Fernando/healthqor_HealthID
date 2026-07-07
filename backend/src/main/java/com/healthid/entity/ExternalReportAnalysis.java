package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "report_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalReportAnalysis {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String gridFsFileId;
    private String fileName;
    private String contentType;
    private String aiSummary;

    @Indexed
    private Instant createdAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
