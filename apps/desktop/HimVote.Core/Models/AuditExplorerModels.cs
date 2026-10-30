using System.Text.Json.Serialization;

namespace HimVote.Core.Models;

public static class VerificationProperties
{
    public const string RecordIntegrity = "RECORD_INTEGRITY";
    public const string CredentialUniqueness = "CREDENTIAL_UNIQUENESS";
    public const string RosterAttestation = "ROSTER_ATTESTATION";
    public const string TallyProof = "TALLY_PROOF";
    public const string AnchorFinality = "ANCHOR_FINALITY";
    public const string BallotSecrecyAssumptions = "BALLOT_SECRECY_ASSUMPTIONS";
    public const string CastAsIntended = "CAST_AS_INTENDED";
    public const string ReceiptFreeness = "RECEIPT_FREENESS";
    public const string CompromisedEndpointResistance = "COMPROMISED_ENDPOINT_RESISTANCE";
    public const string IndependentOperators = "INDEPENDENT_OPERATORS";
    public const string RealWorldEligibility = "REAL_WORLD_ELIGIBILITY";
}

public static class PropertyStatuses
{
    public const string Pass = "PASS";
    public const string Fail = "FAIL";
    public const string Limited = "LIMITED";
    public const string Assumed = "ASSUMED";
    public const string NotSupported = "NOT_SUPPORTED";
    public const string Unverifiable = "UNVERIFIABLE";
}

public static class FailureCodes
{
    public const string None = "NONE";
    public const string BadSignature = "BAD_SIGNATURE";
    public const string Truncated = "TRUNCATED";
    public const string WrongChain = "WRONG_CHAIN";
    public const string InvalidTally = "INVALID_TALLY";
    public const string MissingFinal = "MISSING_FINAL";
    public const string StaleCheckpoint = "STALE_CHECKPOINT";
    public const string ChecksumMismatch = "CHECKSUM_MISMATCH";
    public const string PathTraversalDetected = "PATH_TRAVERSAL_DETECTED";
    public const string SymlinkDetected = "SYMLINK_DETECTED";
    public const string ResourceLimitExceeded = "RESOURCE_LIMIT_EXCEEDED";
}

public sealed class VerificationPropertyItem
{
    [JsonPropertyName("property_name")]
    public string PropertyName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = PropertyStatuses.Unverifiable;

    [JsonPropertyName("failure_code")]
    public string FailureCode { get; set; } = FailureCodes.None;

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    public bool IsPass => string.Equals(Status, PropertyStatuses.Pass, StringComparison.OrdinalIgnoreCase);
    public bool IsFail => string.Equals(Status, PropertyStatuses.Fail, StringComparison.OrdinalIgnoreCase);
    public bool IsWarning => !IsPass && !IsFail;
}

public sealed class RootComparison
{
    [JsonPropertyName("published_root")]
    public string PublishedRoot { get; set; } = string.Empty;

    [JsonPropertyName("computed_root")]
    public string ComputedRoot { get; set; } = string.Empty;

    [JsonPropertyName("matches")]
    public bool Matches { get; set; }
}

public sealed class CandidateTallyItem
{
    [JsonPropertyName("candidate_id")]
    public string CandidateId { get; set; } = string.Empty;

    [JsonPropertyName("candidate_name")]
    public string CandidateName { get; set; } = string.Empty;

    [JsonPropertyName("published_votes")]
    public int PublishedVotes { get; set; }

    [JsonPropertyName("computed_votes")]
    public int ComputedVotes { get; set; }

    [JsonPropertyName("matches")]
    public bool Matches => PublishedVotes == ComputedVotes;
}

public sealed class TallyComparison
{
    [JsonPropertyName("published_total_ballots")]
    public int PublishedTotalBallots { get; set; }

    [JsonPropertyName("computed_total_ballots")]
    public int ComputedTotalBallots { get; set; }

    [JsonPropertyName("matches")]
    public bool Matches { get; set; }

    [JsonPropertyName("candidates")]
    public List<CandidateTallyItem> Candidates { get; set; } = new();
}

public sealed class TrustPins
{
    [JsonPropertyName("schema")]
    public string Schema { get; set; } = "himvote.trust_pins.v1";

    [JsonPropertyName("election_id")]
    public string ElectionId { get; set; } = string.Empty;
    [JsonPropertyName("manifest_digest")]
    public string ManifestDigest { get; set; } = string.Empty;

    [JsonPropertyName("witness_public_key")]
    public string WitnessPublicKey { get; set; } = string.Empty;

    [JsonPropertyName("authority_public_key")]
    public string AuthorityPublicKey { get; set; } = string.Empty;

    [JsonPropertyName("roster_approver_key")]
    public object? RosterApproverKey { get; set; }

    [JsonPropertyName("issuer_key")]
    public object? IssuerKey { get; set; }

    [JsonPropertyName("witness_keys")]
    public object? WitnessKeys { get; set; }
    [JsonPropertyName("contract_address")]
    public string ContractAddress { get; set; } = string.Empty;

    [JsonPropertyName("chain_id")]
    public long ChainId { get; set; }

    [JsonPropertyName("contract_code_hash")]
    public string ContractCodeHash { get; set; } = string.Empty;

    [JsonPropertyName("final_checkpoint_digest")]
    public string FinalCheckpointDigest { get; set; } = string.Empty;
}

public sealed class AuditReport
{
    [JsonPropertyName("election_id")]
    public string ElectionId { get; set; } = string.Empty;

    [JsonPropertyName("manifest_digest")]
    public string ManifestDigest { get; set; } = string.Empty;

    [JsonPropertyName("verifier_checksum")]
    public string VerifierChecksum { get; set; } = string.Empty;

    [JsonPropertyName("verifier_version")]
    public string VerifierVersion { get; set; } = string.Empty;

    [JsonPropertyName("generated_at_utc")]
    public DateTimeOffset GeneratedAtUtc { get; set; }

    [JsonPropertyName("exit_code")]
    public int ExitCode { get; set; }

    [JsonPropertyName("overall_status")]
    public string OverallStatus { get; set; } = PropertyStatuses.Unverifiable;

    [JsonPropertyName("root_comparison")]
    public RootComparison RootComparison { get; set; } = new();

    [JsonPropertyName("tally_comparison")]
    public TallyComparison TallyComparison { get; set; } = new();

    [JsonPropertyName("properties")]
    public List<VerificationPropertyItem> Properties { get; set; } = new();
}
public record AuditReportDto(
    string ElectionId,
    string ManifestDigest,
    string VerifierChecksum,
    string OverallStatus,
    int ExitCode,
    DateTimeOffset GeneratedAtUtc);
