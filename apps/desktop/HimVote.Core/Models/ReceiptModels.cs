using System.Text.Json.Serialization;

namespace HimVote.Core.Models;

public static class ReceiptStatuses
{
    public const string CommittedPendingWitness = "COMMITTED_PENDING_WITNESS";
    public const string Witnessed = "WITNESSED";
    public const string Anchored = "ANCHORED";
    public const string Rejected = "REJECTED";
}

public sealed class ReceiptStatusResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("handle")]
    public string Handle { get; set; } = string.Empty;

    [JsonPropertyName("leaf_index")]
    public long LeafIndex { get; set; }

    [JsonPropertyName("witnessed_at_utc")]
    public DateTimeOffset? WitnessedAtUtc { get; set; }
}

public sealed class CastBallotResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("handle")]
    public string Handle { get; set; } = string.Empty;

    [JsonPropertyName("leaf_index")]
    public long LeafIndex { get; set; }

    [JsonPropertyName("nullifier_commitment")]
    public string NullifierCommitment { get; set; } = string.Empty;
}
