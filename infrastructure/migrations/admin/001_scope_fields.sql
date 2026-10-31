-- Admin API resource scope migration.
-- Apply transactionally before setting ADMIN_SCHEMA_VERSION to 2.

ALTER TABLE elections
    ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255) NOT NULL DEFAULT 'legacy_unscoped';

CREATE INDEX IF NOT EXISTS ix_elections_institution_id
    ON elections (institution_id);

INSERT INTO schema_migrations (service, version, applied_at)
VALUES ('admin_api', '2', NOW());
