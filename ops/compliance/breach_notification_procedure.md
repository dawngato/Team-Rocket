# HimVote Personal Data Breach and Incident Notification Procedure

## 1. Statutory Context and Timelines

This procedure defines mandatory actions upon detection or reasonable suspicion of a personal data breach or cybersecurity incident affecting the HimVote platform. The procedure enforces compliance with DPDPA 2023 Section 8(6), CERT In Cyber Security Directions 2022, and GDPR Articles 33 and 34.

```text
Statutory Notification Deadlines:

* CERT In Notification: Mandatory within 6 hours of incident confirmation.
* Data Protection Board of India (DPBI): Mandatory notification within 24 hours of confirmation.
* Affected Data Principals (Students and Faculty): Direct notification without undue delay if the breach poses significant risk to rights and freedoms.
* European Supervisory Authorities (GDPR): Within 72 hours where EU data subjects are affected.
```

___

## 2. Classification of Incidents and Severity

```text
Incident Severity Tiers:

* Severity 1 (Critical): Confirmed exfiltration or exposure of Identity DB personal data (student records, password hashes, MFA seeds), or compromise of the Credential Issuer private key.
* Severity 2 (Major): Unauthorized administrative access detected without confirmed data exfiltration, or denial of service attack disabling election systems during active voting.
* Severity 3 (Moderate): Localized account compromise affecting a single administrative user with prompt containment.
* Severity 4 (Minor): Isolated probe attempts, failed brute force attacks, or temporary network interruptions without security compromise.
```

___

## 3. Five Phase Breach Notification Workflow

```text
Workflow Phases:

Phase 1: Detection, Containment, and Triage (Hours 0 to 2)
  * Action: Incident detected via Falco alerts, WAF logs, or administrative report.
  * Immediate Containment: Incident Commander isolates affected instances and rotates active credentials.
  * Assessment: Triage team determines whether digital personal data was compromised.

Phase 2: CERT In Statutory Notification (Hours 2 to 6)
  * Action: DPO and Legal Counsel draft the initial cybersecurity incident report.
  * Submission: Formally dispatched to incident@cert_in.org.in within the mandatory 6 hour statutory deadline.

Phase 3: Comprehensive Forensic Investigation (Hours 6 to 24)
  * Action: Digital forensics examines database access journals, network connection records, and KMS API audit logs.
  * Quantification: Establishes exact categories of data accessed and total number of affected student accounts.

Phase 4: Regulatory and Data Principal Communication (Hours 24 to 48)
  * Regulatory Filing: Formal notification submitted to the Data Protection Board of India.
  * Direct Notification: If student personal data was compromised, direct email and SMS notifications dispatched to affected students.

Phase 5: Post Incident Review and Institutional Remediation
  * Action: Root cause analysis completed within five working days. Remediation roadmap presented to the University Senate.
```

___

## 4. Statutory Notification Content Template

The notification transmitted to regulators and affected individuals must include:

1. **Description of the Incident**: Nature of the breach, date, time of occurrence, and discovery timestamp.
2. **Personal Data Categories Involved**: Precise categories compromised (e.g. Student IDs, institutional email addresses, encrypted password hashes).
3. **Assessment of Likely Consequences**: Potential risks to affected individuals (e.g. phishing risks, unauthorized access to university portals).
4. **Immediate Mitigations Implemented**: Technical measures enacted to contain the incident (e.g. system isolation, key revocation, forced credential resets).
5. **Recommended Preventive Steps for Affected Individuals**: Guidance for students (e.g. updating institutional passwords, monitoring account activities).
6. **Designated Point of Contact**: Name, designation, institutional email, and telephone number of the Institutional Data Protection Officer.
