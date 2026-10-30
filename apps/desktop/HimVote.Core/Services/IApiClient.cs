using HimVote.Core.Models;

namespace HimVote.Core.Services;

public class ApiException : Exception
{
    public int StatusCode { get; }
    public string? ErrorCode { get; }

    public ApiException(string message, int statusCode, string? errorCode = null)
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }
}

public interface IApiClient
{
    string BaseUrl { get; set; }
    string? BearerToken { get; set; }

    Task<UserSession> LoginAsync(string email, string password, string? mfaToken = null, CancellationToken cancellationToken = default);
    Task LogoutAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ElectionSummary>> GetElectionsAsync(CancellationToken cancellationToken = default);
    Task<Election> GetElectionByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<Election> CreateElectionAsync(CreateElectionRequest request, CancellationToken cancellationToken = default);
    Task<Election> FreezeElectionAsync(string id, CancellationToken cancellationToken = default);
    Task<Election> OpenElectionAsync(string id, CancellationToken cancellationToken = default);
    Task<Election> CloseElectionAsync(string id, CancellationToken cancellationToken = default);
    Task RequestPublicationAsync(string id, CancellationToken cancellationToken = default);
    Task<ReceiptStatusResponse> GetReceiptStatusAsync(string electionId, string handle, CancellationToken cancellationToken = default);
    Task<PublishedResults> GetPublishedResultsAsync(string electionId, CancellationToken cancellationToken = default);

    // Compatibility methods for generic HTTP calls
    Task<string> PostAsync(string path, object body);
    Task<string> GetAsync(string path);
    Task<T?> PostAsync<T>(string path, object body) where T : class;
    Task<T?> GetAsync<T>(string path) where T : class;
}
