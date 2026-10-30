using System.Text.Json.Serialization;

namespace HimVote.Core.Models;

public enum UserRole
{
    Student,
    Administrator,
    ElectionOfficer
}

public sealed class UserSession
{
    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("role")]
    public UserRole Role { get; set; } = UserRole.Student;

    [JsonPropertyName("bearer_token")]
    public string BearerToken { get; set; } = string.Empty;

    [JsonPropertyName("session_cookie")]
    public string SessionCookie { get; set; } = string.Empty;

    [JsonPropertyName("expires_at_utc")]
    public DateTimeOffset ExpiresAtUtc { get; set; }

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;

    public bool IsAuthenticated => !string.IsNullOrWhiteSpace(BearerToken) && !IsExpired;
}
