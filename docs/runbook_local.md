# HimVote Local Development Runbook and Operational Guide

## 1. Overview and Architecture

The HimVote local development environment provides a fully functioning stack running across local containers. It allows developers to test the entire institutional election lifecycle from administrative bootstrap and roster verification through blind credential issuance, anonymous ballot casting, Merkle tree construction, witness co signing, blockchain anchoring, and offline verification.

```text
Local Services Orchestration:

* gateway: Nginx reverse proxy routing traffic to appropriate origins on port 8080.
* web: Next.js 15 web client application.
* admin_api: Fast administrative management API and publication gate.
* identity_issuer: Authentication, MFA, roster management, and RFC 9474 blind credential issuer.
* casting: Anonymous ballot submission and atomic database outbox writer.
* election_engine: Profile VEEM cryptographic ballot validation and tally adapter.
* identity_db: PostgreSQL 16 cluster dedicated to student and administrative identity.
* casting_db: PostgreSQL 16 cluster dedicated to nullifiers and encrypted ballots.
* checkpoint_worker: Background daemon constructing RFC 9162 Merkle trees.
* witness_stand_in: Local development mock for external witness nodes.
* local_chain_node: Local EVM development blockchain (Anvil or Hardhat).
* anchor_relayer: Background worker submitting witnessed commitments to HimVoteAnchor.sol.
```

Important Safety Guard: The witness stand in and local chain nodes exist exclusively for local development and CI testing. Production builds detect these stand in configurations and refuse to start.

___

## 2. Prerequisites and System Requirements

* Linux (Ubuntu 22.04 or later, Debian 12, or Kali Linux) or macOS
* Docker Engine 24.0 or later and Docker Compose v2
* Python 3.12 with venv and pip
* Node.js 20 LTS or later and npm
* Foundry toolchain (forge, anvil) for smart contract testing
* Optional: .NET 8 SDK (for Windows thick client development)
* Optional: Android Studio and Android SDK 34 (for Android client development)

___

## 3. Environment Setup and Service Launch

### Step 1: Clone Repository and Enter Project Root
```bash
cd /home/Kali/Desktop/HPTU/HimVote
```

### Step 2: Initialize Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
Ensure database passwords, local JWT secrets, and port bindings in `.env` are configured for local development.

### Step 3: Start Local Stack via Docker Compose
Launch all services using compose configuration:
```bash
docker compose up dev_stack
```
To run containers in the background:
```bash
docker compose up dev_detached
```

### Step 4: Verify Container Health
Check running containers:
```bash
docker compose ps
```
Verify that `identity_db`, `casting_db`, `identity_issuer`, `casting`, and `gateway` report status healthy.

___

## 4. Local Network Endpoints and Client Addresses

```text
Service Base URLs:

* Gateway Routing Origin: http://localhost:8080
* Web Application: http://localhost:3000
* Admin API: http://localhost:8080/v1/admin
* Identity and Issuance API: http://localhost:8080/v1/auth and /v1/credentials
* Anonymous Casting API: http://localhost:8080/v1/cast
* Witness Stand In: http://localhost:8081
* Local EVM RPC: http://localhost:8545
```

```text
Client Connection Profiles:

* Web Browser on Same Host: http://localhost:8080
* Windows Desktop Client: http://localhost:8080
* Android Emulator: http://10.0.2.2:8080
* iOS Simulator: http://localhost:8080
* Physical Test Devices: https://LAN_HOST with local development root certificate installed
```

___

## 5. End to End Election Lifecycle Simulation

Follow this sequence to execute a complete election test:

### Step 1: Bootstrap Super Administrator
```bash
python scripts/seed_bootstrap.py
```
This script claims the initial one time bootstrap token, provisions the Super Admin user, and outputs TOTP MFA enrollment parameters.

### Step 2: Create Administrator and Election Officer
Log in as Super Admin and create university administrative users:
```bash
python scripts/create_staff_users.py
```

### Step 3: Draft Election and Roster Ingestion
Create a new student election, configure contests, and import student roster records:
```bash
python scripts/setup_election.py
```

### Step 4: Roster Approval and Manifest Freeze
Simulate Roster Approver signing the roster digest, then freeze the manifest:
```bash
python scripts/freeze_election.py
```
Status transitions to `FROZEN` then `ISSUING`.

### Step 5: Issue Blind Credentials
Simulate test students logging in, blinding random secrets, and obtaining RFC 9474 blind signatures:
```bash
python scripts/issue_test_credentials.py
```

### Step 6: Cast Encrypted Ballots
Advance election state to `OPEN`. Execute automated ballot casting using Profile VEEM:
```bash
python scripts/cast_test_ballots.py
```
Observe the response transition from `COMMITTED_PENDING_WITNESS` to `WITNESSED`.

### Step 7: Close Election and Blockchain Finalization
Close voting, trigger the final witness checkpoint, and await on chain finality:
```bash
python scripts/close_and_anchor.py
```

### Step 8: Execute Standalone Offline Verifier
Export the election audit bundle and run the offline verifier CLI:
```bash
python verifier/verify.py audit_evidence export_dir test_trust_pins
```
Confirm the verifier reports `Status: PASS` and exits with code 0.

___

## 6. Teardown and Clean Reset

To halt all running containers and flush ephemeral development database volumes:
```bash
docker compose down dev_volumes
```
To rebuild containers from source after making backend changes:
```bash
docker compose build dev_services
```
