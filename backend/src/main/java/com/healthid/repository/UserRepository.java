package com.healthid.repository;

import com.healthid.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByHealthId(String healthId);

    Optional<User> findByGoogleSub(String googleSub);

    boolean existsByEmail(String email);

    boolean existsByHealthId(String healthId);

    Page<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrHealthIdContainingIgnoreCase(
            String name, String email, String healthId, Pageable pageable);
}
