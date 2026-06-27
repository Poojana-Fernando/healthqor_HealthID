package com.healthid.repository;

import com.healthid.entity.User;
import com.healthid.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByHealthId(String healthId);

    Optional<User> findByGoogleSub(String googleSub);

    Optional<User> findByGithubSub(String githubSub);

    boolean existsByEmail(String email);

    boolean existsByHealthId(String healthId);

    boolean existsByRole(Role role);

    @Query("""
            {
              $or: [
                { name: { $regex: ?0, $options: 'i' } },
                { email: { $regex: ?0, $options: 'i' } },
                { healthId: { $regex: ?0, $options: 'i' } }
              ]
            }
            """)
    Page<User> searchUsers(String search, Pageable pageable);
}
