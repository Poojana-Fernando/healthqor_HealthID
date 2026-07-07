package com.healthid.service;

import com.healthid.dto.support.AdminSupportTicketResponse;
import com.healthid.dto.support.SupportTicketResponse;
import com.healthid.dto.support.SupportTicketSubmitRequest;
import com.healthid.entity.SupportTicket;
import com.healthid.entity.SupportTicketStatus;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.SupportTicketRepository;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.bson.types.ObjectId;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SupportTicketService {

    private static final long MAX_ATTACHMENT_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private final SupportTicketRepository supportTicketRepository;
    private final GridFsTemplate gridFsTemplate;
    private final MongoTemplate mongoTemplate;
    private final AuditLogService auditLogService;

    public SupportTicketService(
            SupportTicketRepository supportTicketRepository,
            GridFsTemplate gridFsTemplate,
            MongoTemplate mongoTemplate,
            AuditLogService auditLogService) {
        this.supportTicketRepository = supportTicketRepository;
        this.gridFsTemplate = gridFsTemplate;
        this.mongoTemplate = mongoTemplate;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public SupportTicketResponse createTicket(
            SupportTicketSubmitRequest request,
            MultipartFile file,
            String userId) {
        SupportTicket ticket = SupportTicket.builder()
                .ticketNumber(generateTicketNumber())
                .userId(userId)
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .subject(request.getSubject().trim())
                .category(request.getCategory().trim())
                .priority(request.getPriority().trim())
                .message(request.getMessage().trim())
                .status(SupportTicketStatus.RECEIVED)
                .build();

        if (file != null && !file.isEmpty()) {
            storeAttachment(ticket, file);
        }

        ticket.prepareForPersist();
        supportTicketRepository.save(ticket);
        auditLogService.log(userId, "CREATE", "SupportTicket", ticket.getId());
        return mapUserResponse(ticket);
    }

    @Transactional(readOnly = true)
    public Page<SupportTicketResponse> listTicketsForUser(String userId, Pageable pageable) {
        return supportTicketRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapUserResponse);
    }

    @Transactional(readOnly = true)
    public Page<AdminSupportTicketResponse> listTicketsForAdmin(
            String search,
            SupportTicketStatus status,
            String category,
            String priority,
            Pageable pageable) {
        Query query = buildAdminQuery(search, status, category, priority);
        long total = mongoTemplate.count(query, SupportTicket.class);
        query.with(pageable);
        List<SupportTicket> tickets = mongoTemplate.find(query, SupportTicket.class);
        List<AdminSupportTicketResponse> content = tickets.stream()
                .map(this::mapAdminResponse)
                .toList();
        return new PageImpl<>(content, pageable, total);
    }

    @Transactional(readOnly = true)
    public AdminSupportTicketResponse getTicketForAdmin(String id) {
        return mapAdminResponse(getTicketOrThrow(id));
    }

    @Transactional
    public AdminSupportTicketResponse updateStatus(String id, SupportTicketStatus status) {
        SupportTicket ticket = getTicketOrThrow(id);
        ticket.setStatus(status);
        ticket.setUpdatedAt(Instant.now());
        supportTicketRepository.save(ticket);
        auditLogService.log(null, "UPDATE_STATUS", "SupportTicket", ticket.getId());
        return mapAdminResponse(ticket);
    }

    @Transactional(readOnly = true)
    public Resource getAttachmentResource(String ticketId) {
        SupportTicket ticket = getTicketOrThrow(ticketId);
        if (!StringUtils.hasText(ticket.getAttachmentGridFsId())) {
            throw new ResourceNotFoundException("No attachment for this ticket");
        }
        GridFSFile file = gridFsTemplate.findOne(
                Query.query(Criteria.where("_id").is(new ObjectId(ticket.getAttachmentGridFsId()))));
        if (file == null) {
            throw new ResourceNotFoundException("Attachment file not found");
        }
        return gridFsTemplate.getResource(file);
    }

    @Transactional(readOnly = true)
    public long countOpenTickets() {
        return supportTicketRepository.countByStatusIn(
                List.of(SupportTicketStatus.RECEIVED, SupportTicketStatus.IN_PROGRESS));
    }

    private void storeAttachment(SupportTicket ticket, MultipartFile file) {
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new BadRequestException("Attachment exceeds the 5MB limit");
        }
        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType) || !isAllowedContentType(contentType)) {
            throw new BadRequestException("Unsupported file type. Allowed: images, PDF, DOC, DOCX");
        }
        String filename = StringUtils.cleanPath(
                StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "attachment");
        if (filename.contains("..")) {
            throw new BadRequestException("Invalid attachment filename");
        }
        try {
            ObjectId gridFsId = gridFsTemplate.store(
                    file.getInputStream(),
                    filename,
                    contentType);
            ticket.setAttachmentFileName(filename);
            ticket.setAttachmentContentType(contentType);
            ticket.setAttachmentGridFsId(gridFsId.toHexString());
        } catch (IOException e) {
            throw new BadRequestException("Failed to store attachment");
        }
    }

    private boolean isAllowedContentType(String contentType) {
        if (ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return true;
        }
        return contentType.startsWith("image/");
    }

    private Query buildAdminQuery(
            String search,
            SupportTicketStatus status,
            String category,
            String priority) {
        Query query = new Query();
        if (StringUtils.hasText(search)) {
            String pattern = search.trim();
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("ticketNumber").regex(pattern, "i"),
                    Criteria.where("name").regex(pattern, "i"),
                    Criteria.where("email").regex(pattern, "i"),
                    Criteria.where("subject").regex(pattern, "i"),
                    Criteria.where("message").regex(pattern, "i")));
        }
        if (status != null) {
            query.addCriteria(Criteria.where("status").is(status));
        }
        if (StringUtils.hasText(category)) {
            query.addCriteria(Criteria.where("category").is(category.trim()));
        }
        if (StringUtils.hasText(priority)) {
            query.addCriteria(Criteria.where("priority").is(priority.trim()));
        }
        return query;
    }

    private String generateTicketNumber() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String number = "HQ-" + ThreadLocalRandom.current().nextInt(100000, 1_000_000);
            if (!supportTicketRepository.existsByTicketNumber(number)) {
                return number;
            }
        }
        throw new BadRequestException("Could not generate a unique ticket number");
    }

    private SupportTicket getTicketOrThrow(String id) {
        return supportTicketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found"));
    }

    private SupportTicketResponse mapUserResponse(SupportTicket ticket) {
        return SupportTicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .name(ticket.getName())
                .email(ticket.getEmail())
                .subject(ticket.getSubject())
                .category(ticket.getCategory())
                .priority(ticket.getPriority())
                .message(ticket.getMessage())
                .status(ticket.getStatus())
                .attachmentFileName(ticket.getAttachmentFileName())
                .hasAttachment(StringUtils.hasText(ticket.getAttachmentGridFsId()))
                .createdAt(ticket.getCreatedAt())
                .build();
    }

    private AdminSupportTicketResponse mapAdminResponse(SupportTicket ticket) {
        return AdminSupportTicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .userId(ticket.getUserId())
                .name(ticket.getName())
                .email(ticket.getEmail())
                .subject(ticket.getSubject())
                .category(ticket.getCategory())
                .priority(ticket.getPriority())
                .message(ticket.getMessage())
                .status(ticket.getStatus())
                .attachmentFileName(ticket.getAttachmentFileName())
                .attachmentContentType(ticket.getAttachmentContentType())
                .hasAttachment(StringUtils.hasText(ticket.getAttachmentGridFsId()))
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}
