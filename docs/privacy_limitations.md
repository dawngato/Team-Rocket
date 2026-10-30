# HimVote Privacy Limitations and Security Boundaries

## 1. Scope and Principles

Institutional election integrity requires honest communication regarding technical limits. No cryptographic voting protocol can unilaterally eliminate physical coercion, compromised client hardware, or human deception.

HimVote explicitly rejects marketing terms such as unhackable, completely anonymous, or one hundred percent secure. This document defines the exact boundaries of privacy protection provided by the platform, delineating what the cryptographic protocol mathematically guarantees and what remains outside the capability of any software system.

___

## 2. Properties Guaranteed by the System

When deployed according to documented operational procedures, HimVote delivers the following verifiable properties:

* **Decoupled Identity and Ballot State**: The election authority cannot link a student identity to their cast ballot by inspecting server databases, log records, or public audit packages.
* **Append Only Tamper Evidence**: No accepted ballot can be altered, inserted, deleted, or reordered without triggering cryptographic verification failures across witness nodes and independent verifier tools.
* **Independent Tally Correctness**: Any observer can independently recompute and verify the final election tally from publicly available ciphertext and zero knowledge proofs without access to private decryption keys.
* **Single Cast Enforcement**: A valid credential can be used to cast exactly one ballot. Duplicate attempts are permanently rejected.

___

## 3. Explicit Boundaries: What the System Does NOT Solve

### 3.1 Physical Coercion and Supervised Voting
* **Limitation**: The system cannot prevent an external adversary, student leader, employer, or family member from physically standing over a voter while they cast a ballot, or demanding a live screen share session during casting.
* **Technical Reality**: The client application must render the ballot options clearly on screen for the voter to make a selection. Anyone observing the screen during this interaction can observe the voter choice before encryption takes place.
* **Institutional Countermeasure**: High stakes elections should provide private physical voting kiosks or supervised voting booths on campus where voters can vote in complete physical seclusion.

### 3.2 Receipt Freeness and Vote Selling
* **Limitation**: HimVote provides inclusion trackers that allow voters to confirm their ballot is present in the Merkle log, but cannot prevent voters from voluntarily proving their vote to a buyer.
* **Technical Reality**: While the public tracking handle and Merkle leaf contain only encrypted ciphertext and zero knowledge proofs, a voter could record a screen video showing their candidate selection combined with the resulting tracking handle.
* **System Design**: The system never issues a human readable confirmation receipt listing the selected candidate names. Receipt verification displays only evidence progression states (COMMITTED_PENDING_WITNESS, WITNESSED, ANCHOR_FINALIZED).

### 3.3 Compromised Voter Devices and Malicious Software
* **Limitation**: HimVote cannot defend against an endpoint device infected with rootkits, screen recorders, keyloggers, or malicious browser extensions.
* **Technical Reality**: If an attacker controls the voter operating system, they can intercept cleartext user selections before encryption or exfiltrate private unblinded tokens.
* **System Design**: Client applications implement root and jailbreak detection, utilize secure hardware keystores where available, and enforce strict Content Security Policy headers on web applications. However, an adversary with root privileges on the voter endpoint can compromise ballot confidentiality.

### 3.4 Network Timing and Global Traffic Correlation
* **Limitation**: A global passive network adversary with visibility into institutional campus networks and cloud data centers could attempt statistical timing correlation.
* **Technical Reality**: If a student authenticates to the Identity Origin and immediately connects to the Casting Origin, packet timing analysis could correlate the two transactions.
* **System Mitigation**:
  * Architectural separation: Credential issuance window closes before the casting window opens (ISSUANCE_CLOSED precedes OPEN).
  * Edge anonymization: Casting endpoints strip all incoming cookies, client IP headers, and tracking parameters.
  * Recommendation: Institutions should advise voters to submit ballots from residential or cellular networks rather than immediately following campus portal login.

### 3.5 Total Authority Collusion
* **Limitation**: If every trusted authority actively conspires to break privacy, system guarantees degrade.
* **Technical Reality**: If the Identity Database Administrator, Casting Database Administrator, Edge Gateway Operator, and University Network Operations conspire to combine raw database transaction logs with physical network flow records, they could correlate voters with ballots.
* **Protection Against Result Tampering**: Even under total administrative collusion, attackers cannot alter the election outcome unnoticed, because the independent multi organization witnesses and consortium blockchain anchors provide immutable public commitments that cannot be altered without detection.

### 3.6 Very Small Electorates and Turnout Thresholds
* **Limitation**: Mathematical anonymity degrades when the number of eligible or participating voters is small.
* **Technical Reality**: In a departmental election contest where only 3 students participate and all 3 vote for Candidate A, the individual vote of each participant is exposed regardless of cryptographic encryption.
* **System Policy**: The election manifest defines a minimum anonymity threshold. If turnout in a contest falls below this threshold, the election result is automatically classified as PRIVACY_LIMITED, granular breakdowns are suppressed, and warnings are logged in the public audit record.

### 3.7 Stolen Institutional Credentials and Social Engineering
* **Limitation**: The system cannot distinguish an authentic student from an attacker who has obtained valid student portal credentials through phishing, credential stuffing, or physical theft of an unlocked device.
* **Mitigation**: Privileged administrative accounts require multi factor authentication. Student credential recovery procedures notify all secondary email and phone contacts and require reverification by department staff. Recovery never invalidates or reissues an already spent voting credential.
