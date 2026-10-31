-- Delivery status prevents activation, recovery, or invitation tokens from
-- being treated as usable when the configured notification transport failed.
ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

ALTER TABLE recovery_requests
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

ALTER TABLE account_activations
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
