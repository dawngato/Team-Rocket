# HimVote Compliance Architecture: Information Technology Act, 2000

## 1. Statutory Context and Scope

The Information Technology Act 2000, along with the 2008 amendments and associated administrative rules, establishes the legal foundation for electronic transactions, digital signatures, cybersecurity compliance, and cybercrime prosecution in India.

HimVote operates as an institutional intermediary platform facilitating electronic voting and credential issuance. This document maps platform controls to key provisions of the IT Act and mandatory CERT In cybersecurity directives.

___

## 2. Compliance with Section 43A and SPDI Rules 2011

Section 43A of the IT Act mandates that bodies corporate possessing Sensitive Personal Data or Information (SPDI) implement reasonable security practices and procedures.

```text
SPDI Categories and Technical Controls:

1. Passwords and Authentication Credentials (Rule 3)
   * Control: Passwords hashed using Argon2id with salt generation and memory hard configuration. Plaintext passwords are never written to disk, databases, or log files.
   * Session Security: JWT access tokens are cryptographically signed, short lived (15 minutes), and stored in HTTP only secure cookies with strict SameSite attributes.

2. Physical, Physiological and Mental Health Data (Rule 3)
   * Control: HimVote collects zero medical, physiological, or health records.

3. Biometric Information (Rule 3)
   * Control: When WebAuthn (FIDO2) is utilized for administrative multi factor authentication, biometric matching occurs strictly on the local voter device hardware authenticator. Raw biometric data is never transmitted to or processed by HimVote servers.

4. Comprehensive Privacy Policy (Rule 4)
   * Control: An institutional privacy policy is accessible at all application endpoints, clearly articulating collection purposes, storage duration, and security measures.
```

___

## 3. Cybercrime Prevention and Penal Provisions Alignment

```text
Penal Safeguards:

1. Identity Theft and Personation (Sections 66C and 66D)
   * Threat: A malicious actor uses another student enrollment number to obtain voting credentials.
   * Safeguard: Multi stage verification requiring institutional email confirmation, active enrollment matching in the student registry, and optional SMS or authenticator MFA.

2. Privacy Violation and Voyeurism (Section 66E)
   * Threat: Capture of voter ballot selections without consent.
   * Safeguard: Voting booths render zero persistent choices once submitted. Screen capture protection flags are enabled on supported Android and Windows native applications.

3. Unauthorized Access and Computer System Tampering (Sections 43 and 66)
   * Safeguard: Role based access control, strict API rate limiting, Web Application Firewall inspection, and automated database triggers preventing unauthorized record alteration.
```

___

## 4. CERT In Directions Compliance (April 2022 Mandates)

Under directions issued by the Indian Computer Emergency Response Team (CERT In) pursuant to Section 70B(6) of the IT Act:

1. **Mandatory 6 Hour Incident Reporting**:
   * Any cybersecurity incident of specified severity (e.g. data breach, unauthorized database access, ransomware, denial of service) must be formally reported to CERT In within 6 hours of detection.
   * Operational procedures are defined in `ops/compliance/breach_notification_procedure.md`.
2. **Standard Time Synchronization**:
   * All production server nodes, database hosts, and witness daemons synchronize system clocks via Network Time Protocol (NTP) connected to National Informatics Centre (NIC) or National Physical Laboratory (NPL) atomic clocks.
   * Clock drift is continuously monitored via Prometheus alerts.
3. **Log Retention Mandate (180 Days)**:
   * Administrative access logs, authentication logs, and network connection metadata are retained in an immutable, append only format for a minimum rolling window of 180 days within Indian jurisdiction.
