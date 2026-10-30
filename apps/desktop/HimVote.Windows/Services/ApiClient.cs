using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HimVote.Windows.Models;

namespace HimVote.Windows.Services;

public class ApiClient : IApiClient
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;
    private string _baseUrl = "http://localhost:8080";
    private string? _bearerToken;

    public ApiClient(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? new HttpClient();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public string BaseUrl
    {
        get => _baseUrl;
        set => _baseUrl = value.TrimEnd('/');
    }

    public string? BearerToken
    {
        get => _bearerToken;
        set
        {
            _bearerToken = value;
            if (!string.IsNullOrWhiteSpace(_bearerToken))
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _bearerToken);
            }
            else
            {
                _httpClient.DefaultRequestHeaders.Authorization = null;
            }
        }
    }

    public async Task<UserSession> LoginAsync(string email, string password, string? mfaToken = null, CancellationToken cancellationToken = default)
    {
        var requestPayload = new Dictionary<string, object?>
        {
            ["email"] = email,
            ["password"] = password
        };
        if (!string.IsNullOrWhiteSpace(mfaToken))
        {
            requestPayload["mfa_token"] = mfaToken;
        }

        var json = JsonSerializer.Serialize(requestPayload, _jsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/v1/auth/login", content, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Login failed with status {response.StatusCode}: {responseBody}", (int)response.StatusCode);
        }

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        var token = root.TryGetProperty("token", out var tProp) ? tProp.GetString() ?? string.Empty : string.Empty;
        var userId = root.TryGetProperty("user_id", out var uProp) ? uProp.GetString() ?? string.Empty : string.Empty;
        var roleStr = root.TryGetProperty("role", out var rProp) ? rProp.GetString() ?? "STUDENT" : "STUDENT";
        var fullName = root.TryGetProperty("full_name", out var fProp) ? fProp.GetString() ?? email : email;
        var expiresSec = root.TryGetProperty("expires_in_seconds", out var eProp) ? eProp.GetInt32() : 3600;

        var role = UserRole.Student;
        if (string.Equals(roleStr, "ADMINISTRATOR", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(roleStr, "ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            role = UserRole.Administrator;
        }
        else if (string.Equals(roleStr, "ELECTION_OFFICER", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(roleStr, "OFFICER", StringComparison.OrdinalIgnoreCase))
        {
            role = UserRole.ElectionOfficer;
        }

        var session = new UserSession
        {
            UserId = userId,
            Email = email,
            FullName = fullName,
            Role = role,
            BearerToken = token,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddSeconds(expiresSec)
        };

        BearerToken = token;
        return session;
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _httpClient.PostAsync($"{_baseUrl}/v1/auth/logout", null, cancellationToken);
        }
        finally
        {
            BearerToken = null;
        }
    }

    public async Task<IReadOnlyList<ElectionSummary>> GetElectionsAsync(CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/v1/elections", cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Failed to get elections: {response.StatusCode}", (int)response.StatusCode);
        }

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;
        var list = new List<ElectionSummary>();

        JsonElement arrayElement;
        if (root.ValueKind == JsonValueKind.Array)
        {
            arrayElement = root;
        }
        else if (root.TryGetProperty("elections", out var eArray))
        {
            arrayElement = eArray;
        }
        else
        {
            return list;
        }

        foreach (var item in arrayElement.EnumerateArray())
        {
            var summary = JsonSerializer.Deserialize<ElectionSummary>(item.GetRawText(), _jsonOptions);
            if (summary != null)
            {
                list.Add(summary);
            }
        }

        return list;
    }

    public async Task<Election> GetElectionByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/v1/elections/{Uri.EscapeDataString(id)}", cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Failed to get election {id}: {response.StatusCode}", (int)response.StatusCode);
        }

        var election = JsonSerializer.Deserialize<Election>(responseBody, _jsonOptions);
        return election ?? throw new ApiException("Empty election payload received", (int)response.StatusCode);
    }

    public async Task<Election> CreateElectionAsync(CreateElectionRequest request, CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(request, _jsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/v1/elections", content, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Failed to create election: {response.StatusCode}", (int)response.StatusCode);
        }

        var election = JsonSerializer.Deserialize<Election>(responseBody, _jsonOptions);
        return election ?? throw new ApiException("Empty election payload on creation", (int)response.StatusCode);
    }

    public async Task<Election> FreezeElectionAsync(string id, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.PostAsync($"{_baseUrl}/v1/elections/{Uri.EscapeDataString(id)}/freeze", null, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Failed to freeze election {id}: {response.StatusCode}", (int)response.StatusCode);
        }

        var election = JsonSerializer.Deserialize<Election>(responseBody, _jsonOptions);
        return election ?? throw new ApiException("Empty election payload on freeze", (int)response.StatusCode);
    }

    public async Task<Election> OpenElectionAsync(string id, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.PostAsync($"{_baseUrl}/v1/elections/{Uri.EscapeDataString(id)}/open", null, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Failed to open election {id}: {response.StatusCode}", (int)response.StatusCode);
        }

        var election = JsonSerializer.Deserialize<Election>(responseBody, _jsonOptions);
        return election ?? throw new ApiException("Empty election payload on open", (int)response.StatusCode);
    }

    public async Task<Election> CloseElectionAsync(string id, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.PostAsync($"{_baseUrl}/v1/elections/{Uri.EscapeDataString(id)}/close", null, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Failed to close election {id}: {response.StatusCode}", (int)response.StatusCode);
        }

        var election = JsonSerializer.Deserialize<Election>(responseBody, _jsonOptions);
        return election ?? throw new ApiException("Empty election payload on close", (int)response.StatusCode);
    }

    public async Task RequestPublicationAsync(string id, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.PostAsync($"{_baseUrl}/v1/elections/{Uri.EscapeDataString(id)}/publication-request", null, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ApiException($"Failed to request publication: {response.StatusCode} {responseBody}", (int)response.StatusCode);
        }
    }

    public async Task<ReceiptStatusResponse> GetReceiptStatusAsync(string electionId, string handle, CancellationToken cancellationToken = default)
    {
        var url = $"{_baseUrl}/v1/cast/{Uri.EscapeDataString(electionId)}/receipts/{Uri.EscapeDataString(handle)}";
        var response = await _httpClient.GetAsync(url, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Receipt query failed: {response.StatusCode}", (int)response.StatusCode);
        }

        var status = JsonSerializer.Deserialize<ReceiptStatusResponse>(responseBody, _jsonOptions);
        return status ?? throw new ApiException("Empty receipt response payload", (int)response.StatusCode);
    }

    public async Task<PublishedResults> GetPublishedResultsAsync(string electionId, CancellationToken cancellationToken = default)
    {
        var url = $"{_baseUrl}/v1/elections/{Uri.EscapeDataString(electionId)}/results";
        var response = await _httpClient.GetAsync(url, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException($"Results query failed: {response.StatusCode}", (int)response.StatusCode);
        }

        var results = JsonSerializer.Deserialize<PublishedResults>(responseBody, _jsonOptions);
        return results ?? throw new ApiException("Empty results response payload", (int)response.StatusCode);
    }
}
