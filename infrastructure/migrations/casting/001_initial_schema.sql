-- Casting cluster schema (no student ID, no session, no login data)
-- Immutable ballot rows with unique constraints on nullifier and leaf index

CREATE TABLE IF NOT EXISTS elections (
    id VARCHAR(255) PRIMARY KEY,
    state VARCHAR(100) NOT NULL DEFAULT 'DRAFT',
    manifest_digest TEXT,
    opens_at_utc TIMESTAMPTZ,
    closes_at_utc TIMESTAMPTZ,
    issuance_cutoff_utc TIMESTAMPTZ,
    state_version INTEGER NOT NULL DEFAULT 0,
    next_leaf_index BIGINT NOT NULL DEFAULT 0,
    last_witnessed_tree_size BIGINT NOT NULL DEFAULT 0,
    final_tree_size BIGINT,
    transition_digest TEXT,
    max_unwitnessed_backlog INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manifest_versions (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    version INTEGER NOT NULL,
    digest TEXT NOT NULL,
    manifest_content TEXT,
    signed_by VARCHAR(255),
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contests (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    contest_index INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    selection_rule VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(255) PRIMARY KEY,
    contest_id VARCHAR(255) NOT NULL REFERENCES contests(id),
    candidate_index INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accepted_encrypted_ballots (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    leaf_index BIGINT NOT NULL,
    credential_nullifier TEXT NOT NULL,
    ballot_id VARCHAR(255) NOT NULL,
    manifest_digest TEXT NOT NULL,
    credential_proof_b64url TEXT NOT NULL,
    engine_ballot_b64url TEXT NOT NULL,
    engine_proofs_b64url TEXT NOT NULL,
    engine_record_version VARCHAR(100) NOT NULL DEFAULT 'v1',
    request_digest TEXT NOT NULL,
    receipt_handle VARCHAR(255) NOT NULL UNIQUE,
    nullifier_commitment TEXT NOT NULL,
    cast_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (election_id, credential_nullifier),
    UNIQUE (election_id, leaf_index)
);

CREATE TABLE IF NOT EXISTS checkpoint_outbox (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    leaf_index BIGINT NOT NULL,
    ballot_id VARCHAR(255) NOT NULL,
    leaf_digest TEXT NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (election_id, leaf_index)
);

CREATE TABLE IF NOT EXISTS witness_acknowledgements (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    tree_size BIGINT NOT NULL,
    merkle_root TEXT NOT NULL,
    witness_key_id VARCHAR(255) NOT NULL,
    witness_signature TEXT NOT NULL,
    acknowledged_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tally_proofs (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    manifest_digest TEXT NOT NULL,
    tally_data TEXT NOT NULL,
    proof_data TEXT NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS published_results (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    manifest_digest TEXT NOT NULL,
    total_ballots INTEGER NOT NULL,
    tally_json TEXT NOT NULL,
    published_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS election_events (
    id VARCHAR(255) PRIMARY KEY,
    election_id VARCHAR(255) NOT NULL REFERENCES elections(id),
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable triggers: no UPDATE or DELETE on ballot rows
CREATE OR REPLACE FUNCTION prevent_ballot_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'accepted_encrypted_ballots rows are strictly append only and immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ballot_immutable_trigger ON accepted_encrypted_ballots;
CREATE TRIGGER ballot_immutable_trigger
BEFORE UPDATE OR DELETE ON accepted_encrypted_ballots
FOR EACH ROW EXECUTE FUNCTION prevent_ballot_modification();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ballots_election_nullifier ON accepted_encrypted_ballots(election_id, credential_nullifier);
CREATE INDEX IF NOT EXISTS idx_ballots_election_leaf ON accepted_encrypted_ballots(election_id, leaf_index);
CREATE INDEX IF NOT EXISTS idx_ballots_receipt_handle ON accepted_encrypted_ballots(election_id, receipt_handle);
CREATE INDEX IF NOT EXISTS idx_outbox_election ON checkpoint_outbox(election_id);
CREATE INDEX IF NOT EXISTS idx_witness_ack_election ON witness_acknowledgements(election_id);
