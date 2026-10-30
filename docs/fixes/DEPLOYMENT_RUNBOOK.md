# HimVote Deployment Runbook and Operations Guide

This runbook provides the operational procedure for deploying, verifying, and maintaining the HimVote election infrastructure.

## 1. Network Topology and Port Allocation

| Component | Port | Exposure | Purpose |
|---|---|---|---|
| Gateway HTTP | 80 | Public | Automatic 301 redirect to HTTPS and ACME challenge validation |
| Gateway HTTPS | 443 | Public | TLS termination, reverse proxy, and HSTS enforcement |
| Web Application | 3000 | Internal network | Next.js frontend application |
| Identity Issuer | 8081 | Internal / Localhost | Student and staff authentication and blind credential issuance |
| Casting Service | 8082 | Internal / Localhost | Anonymous ballot submission and single cast verification |
| Admin API | 8083 | Internal / Localhost | Election lifecycle, manifest freezing, and evidence publishing |
| Election Engine | 8084 | Internal / Localhost | Ballot encryption and tally proofs |
| Witness Service | 8086 | Internal / Localhost | Merkle tree checkpoint signing |
| Foundry Anvil Node | 8545 | Internal / Localhost | Local EVM blockchain anchor |
| Identity PostgreSQL | 5432 | Internal network | Scram-sha-256 authenticated student database |
| Casting PostgreSQL | 5432 | Internal network | Scram-sha-256 authenticated anonymous ballot database |
| Redis Cache | 6379 | Internal network | Distributed sliding window rate limiter |

---

## 2. Preflight Deployment Verification

Always execute the preflight checks before launching containers:

```bash
# 1. Run Python environment validator
python3 scripts/validate_env.py

# 2. Run automated preflight script
bash scripts/preflight_check.sh
```

The preflight check guarantees:
- All required environment variables are present.
- Passwords meet minimum entropy requirements (>= 16 characters).
- No default or dictionary passwords are deployed to production.
- Docker Compose configuration parses cleanly without syntax errors.

---

## 3. Local Development Startup

To run the complete stack locally using containerized services:

```bash
# Build and launch all local development services
docker compose up -d --build

# Inspect running container status
docker compose ps

# View service logs
docker compose logs -f gateway web identity_issuer casting
```

---

## 4. Production EC2 Deployment Guide

Target host: `13.232.47.32` (`ubuntu@13.232.47.32`)
Repository root: `/opt/himvote`

### Step 1: Human Approval Protocol
Before deploying to production, obtain explicit authorization. Never push changes or wipe volumes without human approval.

### Step 2: Environment File Configuration
Create `/opt/himvote/.env` with high-entropy production secrets:
```bash
APP_ENV=production
LOG_LEVEL=info
IDENTITY_DB_PASSWORD=<32-char-random-hex>
CASTING_DB_PASSWORD=<32-char-random-hex>
REDIS_PASSWORD=<32-char-random-hex>
AUDITOR_PUBLIC_KEY_FINGERPRINT=<ed25519-public-key-fingerprint>
WITNESS_KEY_ID=himvote_prod_witness_v1
```

Validate the production configuration:
```bash
python3 scripts/validate_env.py /opt/himvote/.env
```

### Step 3: SSL Certificate Issuance
If using Let's Encrypt with Certbot:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d vote.yourdomain.ac.in
sudo cp /etc/letsencrypt/live/vote.yourdomain.ac.in/fullchain.pem /opt/himvote/certs/
sudo cp /etc/letsencrypt/live/vote.yourdomain.ac.in/privkey.pem /opt/himvote/certs/
```

### Step 4: Container Launch
Deploy the production overlay:
```bash
cd /opt/himvote
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

### Step 5: Post-Deployment Smoke Verification
```bash
# 1. Verify HTTP to HTTPS 301 redirect
curl -I http://localhost/healthz

# 2. Verify HTTPS health endpoint
curl -k -I https://localhost/healthz

# 3. Run integration verification
python3 tools/verify_integrations.py
```

---

## 5. Persistence and State Management

- **PostgreSQL Databases**: Stored in `identity_db_data` and `casting_db_data` named volumes.
- **Blockchain State**: Anvil saves snapshot state to `/anvil-state/state.json` inside the `anvil_state` named volume.
- **Preservation Rule**: NEVER execute `docker compose down -v` in production.
