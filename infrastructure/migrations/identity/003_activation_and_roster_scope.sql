-- Single use account activation and optional class-scoped roster corrections.
CREATE TABLE IF NOT EXISTS account_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at TIMESTAMPTZ NULL
);

ALTER TABLE roster_corrections
    ADD COLUMN IF NOT EXISTS class_id VARCHAR(255);
