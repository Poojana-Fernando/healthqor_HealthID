package com.healthid.repository;

import com.healthid.entity.SupportTicket;
import com.healthid.entity.SupportTicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupportTicketRepository extends MongoRepository<SupportTicket, String> {

    Page<SupportTicket> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByStatusIn(Iterable<SupportTicketStatus> statuses);

    boolean existsByTicketNumber(String ticketNumber);

    Optional<SupportTicket> findByTicketNumber(String ticketNumber);
}
