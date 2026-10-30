using System.Text.Json.Serialization;

namespace HimVote.Core.Models;

public record ElectionDto(
    string Id,
    string Title,
    string State,
    string? ManifestDigest,
    string? OpensAtUtc,
    string? ClosesAtUtc,
    string? IssuanceCutoffUtc,
    int? EligibleCount,
    List<CandidateDto> Candidates);

public record CandidateDto(string Id, string Name, string Contest);

public record ElectionStateInfo(string State, string Label, bool IsConfirmed, string Color);

public static class ElectionStates
{
    public const string Draft = "DRAFT";
    public const string RosterFrozen = "ROSTER_FROZEN";
    public const string Open = "OPEN";
    public const string Closed = "CLOSED";
    public const string TallyProduced = "TALLY_PRODUCED";
    public const string ResultsPublished = "RESULTS_PUBLISHED";
    public const string Archived = "ARCHIVED";
}

public sealed class Candidate
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("contest")]
    public string Contest { get; set; } = string.Empty;
}

public sealed class ElectionSummary
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("opens_at_utc")]
    public DateTimeOffset OpensAtUtc { get; set; }

    [JsonPropertyName("closes_at_utc")]
    public DateTimeOffset ClosesAtUtc { get; set; }
}

public sealed class Election
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("manifest_digest")]
    public string ManifestDigest { get; set; } = string.Empty;

    [JsonPropertyName("opens_at_utc")]
    public DateTimeOffset OpensAtUtc { get; set; }

    [JsonPropertyName("closes_at_utc")]
    public DateTimeOffset ClosesAtUtc { get; set; }

    [JsonPropertyName("issuance_cutoff_utc")]
    public DateTimeOffset IssuanceCutoffUtc { get; set; }

    [JsonPropertyName("eligible_count")]
    public int EligibleCount { get; set; }

    [JsonPropertyName("candidates")]
    public List<Candidate> Candidates { get; set; } = new();
}

public sealed class CreateElectionRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("contest")]
    public string Contest { get; set; } = string.Empty;

    [JsonPropertyName("selection_rule")]
    public string SelectionRule { get; set; } = "single_choice";

    [JsonPropertyName("opens_at_utc")]
    public DateTimeOffset OpensAtUtc { get; set; }

    [JsonPropertyName("closes_at_utc")]
    public DateTimeOffset ClosesAtUtc { get; set; }

    [JsonPropertyName("issuance_cutoff_utc")]
    public DateTimeOffset IssuanceCutoffUtc { get; set; }

    [JsonPropertyName("min_anonymous_turnout")]
    public int MinAnonymousTurnout { get; set; } = 10;
}

public sealed class PublishedResults
{
    [JsonPropertyName("election_id")]
    public string ElectionId { get; set; } = string.Empty;

    [JsonPropertyName("manifest_digest")]
    public string ManifestDigest { get; set; } = string.Empty;

    [JsonPropertyName("tally")]
    public Dictionary<string, int> Tally { get; set; } = new();

    [JsonPropertyName("total_ballots")]
    public int TotalBallots { get; set; }

    [JsonPropertyName("published_at_utc")]
    public DateTimeOffset PublishedAtUtc { get; set; }

    [JsonPropertyName("privacy_limited")]
    public bool PrivacyLimited { get; set; }
}
