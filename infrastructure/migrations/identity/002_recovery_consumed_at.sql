-- Records one time recovery token consumption without deleting audit history.
ALTER TABLE recovery_requests
    ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;
