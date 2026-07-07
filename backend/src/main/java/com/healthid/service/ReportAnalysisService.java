package com.healthid.service;

import com.healthid.dto.ai.ReportAnalysisResponse;
import com.healthid.entity.ExternalReportAnalysis;
import com.healthid.entity.User;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.ExternalReportAnalysisRepository;
import com.healthid.repository.UserRepository;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.bson.types.ObjectId;
import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Set;

@Service
public class ReportAnalysisService {

    private static final long MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf");

    private final UserRepository userRepository;
    private final ExternalReportAnalysisRepository analysisRepository;
    private final GridFsTemplate gridFsTemplate;
    private final AIService aiService;
    private final AuditLogService auditLogService;

    public ReportAnalysisService(
            UserRepository userRepository,
            ExternalReportAnalysisRepository analysisRepository,
            GridFsTemplate gridFsTemplate,
            AIService aiService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.analysisRepository = analysisRepository;
        this.gridFsTemplate = gridFsTemplate;
        this.aiService = aiService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public ReportAnalysisResponse analyzeReport(String email, MultipartFile file) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Report image file is required");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file");
        }

        String gridFsId = storeFile(file, bytes);
        String contentType = file.getContentType();
        String summary = aiService.analyzeReportImage(bytes, contentType);

        ExternalReportAnalysis analysis = ExternalReportAnalysis.builder()
                .userId(user.getId())
                .gridFsFileId(gridFsId)
                .fileName(StringUtils.cleanPath(
                        StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "report"))
                .contentType(contentType)
                .aiSummary(summary)
                .build();
        analysisRepository.save(analysis);

        auditLogService.log(user.getId(), "AI_REPORT_ANALYSIS", "ExternalReportAnalysis", analysis.getId());
        return map(analysis);
    }

    @Transactional(readOnly = true)
    public List<ReportAnalysisResponse> getHistory(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return analysisRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource getImage(String email, String analysisId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        ExternalReportAnalysis analysis = analysisRepository.findByIdAndUserId(analysisId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Report analysis not found"));
        if (!StringUtils.hasText(analysis.getGridFsFileId())) {
            throw new ResourceNotFoundException("No image for this analysis");
        }
        GridFSFile gridFile = gridFsTemplate.findOne(
                Query.query(Criteria.where("_id").is(new ObjectId(analysis.getGridFsFileId()))));
        if (gridFile == null) {
            throw new ResourceNotFoundException("Image file not found");
        }
        return gridFsTemplate.getResource(gridFile);
    }

    private String storeFile(MultipartFile file, byte[] bytes) {
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new BadRequestException("File exceeds the 5MB limit");
        }
        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType) || !isAllowedContentType(contentType)) {
            throw new BadRequestException("Unsupported file type. Allowed: images and PDF");
        }
        String filename = StringUtils.cleanPath(
                StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "report");
        if (filename.contains("..")) {
            throw new BadRequestException("Invalid filename");
        }
        try {
            ObjectId gridFsId = gridFsTemplate.store(
                    new ByteArrayInputStream(bytes),
                    filename,
                    contentType);
            return gridFsId.toHexString();
        } catch (Exception e) {
            throw new BadRequestException("Failed to store file");
        }
    }

    private boolean isAllowedContentType(String contentType) {
        if (ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return true;
        }
        return contentType.startsWith("image/");
    }

    private ReportAnalysisResponse map(ExternalReportAnalysis analysis) {
        return ReportAnalysisResponse.builder()
                .id(analysis.getId())
                .fileName(analysis.getFileName())
                .contentType(analysis.getContentType())
                .aiSummary(analysis.getAiSummary())
                .createdAt(analysis.getCreatedAt())
                .build();
    }
}
