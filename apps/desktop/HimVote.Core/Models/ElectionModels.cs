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