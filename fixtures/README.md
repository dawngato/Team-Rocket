# HimVote Fixtures and Simulation Harness

This folder provides institutional seed data and end to end verification simulation for the HimVote election platform.

## Overview

The fixtures package provides realistic institutional data for Himachal Pradesh Technical University, abbreviated as HPTU. It enables local testing, continuous integration validation, and complete verification of the cryptographic election audit protocol.

## Seed Data Contents

The seed data file seed_data.json contains complete institutional structures:

* Tenant: Himachal Pradesh Technical University located in Hamirpur
* Campuses: Hamirpur Main Campus, Kangra Regional Campus, Solan Satellite Campus
* Departments: Computer Science and Engineering, Electrical Engineering, Mechanical Engineering
* Roles: Super Administrator, Administrator, Election Officer, Teacher, Student, Roster Approver, Independent Auditor, Public Observer
* Permissions: Thirteen granular permissions covering administrative, issuance, casting, and audit operations
* Staff Accounts: Institutional administrative and academic staff profiles with role assignments
* Student Roster: Exactly one hundred verified students distributed across Computer Science, Electrical, and Mechanical departments
* Sample Election: HPTU Student Council Presidential Election 2026 with four candidates, plurality selection rule, and defined UTC schedule

## Simulation Workflow

The simulation script simulate_election.py runs the ten stage election protocol:

* Stage 1: Initializes local SQLite databases for identity and casting clusters
* Stage 2: Freezes the election manifest and computes canonical RFC 8785 manifest digest
* Stage 3: Signs the roster snapshot with the Roster Approver cryptographic key
* Stage 4: Issues blind credentials to all one hundred eligible students per RFC 9474
* Stage 5: Submits encrypted ballots through the casting origin with nullifier uniqueness checks
* Stage 6: Executes checkpoint worker to construct the RFC 9162 Merkle tree log
* Stage 7: Obtains witness signature on the final witness checkpoint
* Stage 8: Simulates anchor relayer publishing the checkpoint to the consortium chain
* Stage 9: Exports the complete evidence package including ballots, leaves, and manifest
* Stage 10: Invokes the standalone verifier CLI audit_evidence subcommand and asserts return code zero

## Execution Guide

Run the simulation script using Python 3:

```bash
python3 fixtures/simulate_election.py
```

The script prints the progress of each stage, displays the verified Merkle root and tree size, verifies all eleven security and integrity properties, and confirms auditor attestation.
