# Election Lifecycle State Machine

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Guarded State Transition Specification

## 1. Primary Lifecycle Transition Table

<table>
<tr><th>Current State</th><th>Allowed Next State</th><th>Authorized Role</th><th>Preconditions</th><th>Side Effects</th></tr>
<tr><td>DRAFT</td><td>IN_REVIEW</td><td>Election Officer</td><td>Contest definitions and candidate nominations complete</td><td>Draft locked for administrative review</td></tr>
<tr><td>IN_REVIEW</td><td>APPROVED</td><td>Administrator</td><td>Approval by authorized administrator independent of drafter</td><td>Approval signature recorded in audit log</td></tr>
<tr><td>APPROVED</td><td>FROZEN</td><td>Election Officer</td><td>Roster snapshot signed by Roster Approver; manifest digest computed</td><td>Canonical RFC 8785 manifest digest locked permanently</td></tr>
<tr><td>FROZEN</td><td>SCHEDULED</td><td>Election Officer</td><td>UTC start and end timestamps validated against trusted server clock</td><td>Election queue initialized</td></tr>
<tr><td>SCHEDULED</td><td>OPEN</td><td>Server Clock Daemon</td><td>Current UTC timestamp reaches opens_at_utc</td><td>Ballot acceptance enabled on casting gateway</td></tr>
<tr><td>OPEN</td><td>CLOSING</td><td>Server Clock Daemon / Officer</td><td>Current UTC timestamp reaches closes_at_utc</td><td>New ballot acceptance blocked; in flight requests drained</td></tr>
<tr><td>CLOSING</td><td>CLOSED</td><td>Election Officer</td><td>Unwitnessed backlog fully ingested by checkpoint worker</td><td>Final tree size locked; casting gateway closed permanently</td></tr>
<tr><td>CLOSED</td><td>FINAL_WITNESSED</td><td>Witness Service</td><td>Witness signs final checkpoint matching closed tree size</td><td>Witness final receipt issued</td></tr>
<tr><td>FINAL_WITNESSED</td><td>AUDITED</td><td>Independent Auditor</td><td>Standalone verifier executes and verifies all eleven properties</td><td>Auditor signs cryptographic attestation</td></tr>
<tr><td>AUDITED</td><td>PUBLISHED</td><td>Election Officer</td><td>Auditor attestation present and valid against trust pins</td><td>Results and public audit archive published to observers</td></tr>
</table>

## 2. Guarded Exception States

<table>
<tr><th>Current State</th><th>Exception State</th><th>Trigger Condition</th><th>Recovery Path</th></tr>
<tr><td>OPEN</td><td>PAUSED</td><td>Suspected anomaly or infrastructure emergency</td><td>Can transition back to OPEN upon multi admin approval; ballots rejected while paused</td></tr>
<tr><td>ANY (Pre Final)</td><td>CANCELLED</td><td>Irrecoverable procedural violation before closure</td><td>Irreversible terminal state; cancellation reason signed and published</td></tr>
<tr><td>CLOSED / FINAL</td><td>DISPUTED</td><td>Audit check failure or witness equivocation detected</td><td>Investigation workflow initiated; results publication permanently blocked</td></tr>
<tr><td>FINAL_WITNESSED</td><td>AUDIT_FAILED</td><td>Verifier recomputation mismatch or invalid proof detected</td><td>Terminal state; tamper report generated and results withheld</td></tr>
</table>
