# Observability and Telemetry Architecture

This directory defines OpenTelemetry redaction pipelines and Prometheus monitoring rules for HimVote.

## Core Observability Policies
* Complete data redaction: Personal identifiable information, student IDs, passwords, session tokens, and ballot choices are stripped prior to metric export or trace storage.
* Outbox backlog alerting: Alert triggers whenever unwitnessed ballot backlog exceeds safe operational thresholds.
* Witness lag monitoring: Pings alerts when witness acknowledgment latency exceeds SLA targets.
* Blockchain anchor finality tracking: Monitors pending Ethereum transaction status until finality confirmation.
