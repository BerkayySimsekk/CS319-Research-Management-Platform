package com.halenteck.demo.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;





@Service
@Order(1)
public class DatabaseMigrationService {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigrationService.class);

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public DatabaseMigrationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    @Transactional
    public void migrateDatabaseConstraints() {
        try {
            migrateAuditLogActionConstraint();
            migrateParticipantEnrollmentStatusConstraint();
        } catch (Exception e) {
            logger.error("Failed to migrate database constraints", e);


        }
    }

    private void migrateAuditLogActionConstraint() {
        try {

            List<String> tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_audit_logs'",
                String.class
            );

            if (tables.isEmpty()) {
                logger.info("study_audit_logs table does not exist yet, skipping constraint migration");
                return;
            }


            List<String> constraints = jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints " +
                "WHERE table_schema = 'public' AND table_name = 'study_audit_logs' " +
                "AND constraint_name = 'study_audit_logs_action_check'",
                String.class
            );


            String allowedValues = "'STUDY_CREATED','STUDY_UPDATED','STUDY_PUBLISHED','STUDY_CLOSED'," +
                    "'STUDY_ARCHIVED','COLLABORATOR_ADDED','COLLABORATOR_ROLE_CHANGED','COLLABORATOR_REMOVED'," +
                    "'QUIZ_ASSIGNED','TASK_ASSIGNED','TASK_COMPLETED','ARTIFACT_LINKED','ARTIFACT_UNLINKED'," +
                    "'RATING_CRITERION_ADDED','RATING_CRITERION_UPDATED','RATING_CRITERION_REMOVED'," +
                    "'INVITE_CREATED','INVITE_ACCEPTED','AUDIT_LOG_EXPORTED','REVIEWER_NOTE_ADDED'";

            if (!constraints.isEmpty()) {

                logger.info("Updating study_audit_logs_action_check constraint...");
                jdbcTemplate.execute("ALTER TABLE study_audit_logs DROP CONSTRAINT IF EXISTS study_audit_logs_action_check");
            }


            String sql = String.format(
                "ALTER TABLE study_audit_logs ADD CONSTRAINT study_audit_logs_action_check CHECK (action IN (%s))",
                allowedValues
            );
            jdbcTemplate.execute(sql);
            logger.info("Successfully updated study_audit_logs_action_check constraint");

        } catch (Exception e) {
            logger.warn("Could not migrate study_audit_logs_action_check constraint: " + e.getMessage());


        }
    }





    private void migrateParticipantEnrollmentStatusConstraint() {
        try {

            List<String> tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participant_study_enrollments'",
                String.class
            );

            if (tables.isEmpty()) {
                logger.info("participant_study_enrollments table does not exist yet, skipping constraint migration");
                return;
            }


            List<String> constraints = jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints " +
                "WHERE table_schema = 'public' AND table_name = 'participant_study_enrollments' " +
                "AND constraint_type = 'CHECK'",
                String.class
            );


            for (String constraintName : constraints) {
                if (constraintName.contains("status") || constraintName.contains("check")) {
                    logger.info("Dropping constraint: " + constraintName);
                    jdbcTemplate.execute("ALTER TABLE participant_study_enrollments DROP CONSTRAINT IF EXISTS " + constraintName);
                }
            }


            jdbcTemplate.execute("ALTER TABLE participant_study_enrollments DROP CONSTRAINT IF EXISTS participant_study_enrollments_status_check");


            String allowedValues = "'ENROLLED','PENDING_QUIZ','PENDING_QUESTIONNAIRE','PENDING_QUIZ_AND_QUESTIONNAIRE','QUIZ_PASSED','QUIZ_FAILED','PENDING_APPROVAL'";


            String sql = String.format(
                "ALTER TABLE participant_study_enrollments ADD CONSTRAINT participant_study_enrollments_status_check CHECK (status::text = ANY(ARRAY[%s]))",
                allowedValues
            );
            jdbcTemplate.execute(sql);
            logger.info("Successfully updated participant_study_enrollments_status_check constraint");

        } catch (Exception e) {
            logger.warn("Could not migrate participant_study_enrollments_status_check constraint: " + e.getMessage());


        }
    }
}

