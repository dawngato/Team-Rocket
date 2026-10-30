using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HimVote.Core.Models;

namespace HimVote.Core.Services;

public class ApiClient : IApiClient
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;
    private string _baseUrl;
    private string? _bearerToken;

    public string BaseUrl
    {
        get => _baseUrl;
        set
        {
            _baseUrl = value.TrimEnd('/');
            if (Uri.TryCreate(_baseUrl, UriKind.Absolute, out var uri))
            {
                _httpClient.BaseAddress = uri;
            }
        }
    }

    public string? BearerToken
    {
        get => _bearerToken;
        set
        {
            _bearerToken = value;
            if (string.IsNullOrWhiteSpace(value))
            {
                _httpClient.DefaultRequestHeaders.Authorization = null;
            }
            else
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", value);
            }
        }
    }

    public ApiClient(string baseUrl = "http://localhost:8080", HttpClient? httpClient = null)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _httpClient = httpClient ?? new HttpClient();
        if (Uri.TryCreate(_baseUrl, UriKind.Absolute, out var uri))
        {
            _httpClient.BaseAddress = uri;
        }

        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };
    }

    public async Task<UserSession> LoginAsync(string email, string password, string? mfaToken = null, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            email,
            password,
            mfa_token = mfaToken
        };

        var response = await SendJsonAsync<UserSession>(HttpMethod.Post, "/api/v1/auth/login", payload, cancellationToken);
        if (response != null && !string.IsNullOrWhiteSpace(response.BearerToken))
        {
            BearerToken = response.BearerToken;
        }
        return response ?? throw new ApiException("Empty response from identity origin.", 500);
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await SendRequestAsync(HttpMethod.Post, "/api/v1/auth/logout", cancellationToken);
        }
        catch
        {
        }
        finally
        {
            BearerToken = null;
        }
    }

    public async Task<IReadOnlyList<ElectionSummary>> GetElectionsAsync(CancellationToken cancellationToken = default)
    {
        var list = await SendJsonAsync<List<ElectionSummary>>(HttpMethod.Get, "/api/v1/elections", null, cancellationToken);
        return list ?? new List<ElectionSummary>();
    }

    public async Task<Election> GetElectionByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        var election = await SendJsonAsync<Election>(HttpMethod.Get, $"/api/v1/elections/{Uri.EscapeDataString(id)}", null, cancellationToken);
        return election ?? throw new ApiException($"Election {id} not found.", 404);
    }

    public async Task<Election> CreateElectionAsync(CreateElectionRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var result = await SendJsonAsync<Election>(HttpMethod.Post, "/api/v1/admin/elections", request, cancellationToken);
        return result ?? throw new ApiException("Failed to create election.", 500);
    }

    public async Task<Election> FreezeElectionAsync(string id, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        var result = await SendJsonAsync<Election>(HttpMethod.Post, $"/api/v1/admin/elections/{Uri.EscapeDataString(id)}/freeze", null, cancellationToken);
        return result ?? throw new ApiException($"Failed to freeze roster for {id}.", 500);
    }

    public async Task<Election> OpenElectionAsync(string id, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        var result = await SendJsonAsync<Election>(HttpMethod.Post, $"/api/v1/admin/elections/{Uri.EscapeDataString(id)}/open", null, cancellationToken);
        return result ?? throw new ApiException($"Failed to open election {id}.", 500);
    }

    public async Task<Election> CloseElectionAsync(string id, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        var result = await SendJsonAsync<Election>(HttpMethod.Post, $"/api/v1/admin/elections/{Uri.EscapeDataString(id)}/close", null, cancellationToken);
        return result ?? throw new ApiException($"Failed to close election {id}.", 500);
    }

    public async Task RequestPublicationAsync(string id, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        await SendRequestAsync(HttpMethod.Post, $"/api/v1/admin/elections/{Uri.EscapeDataString(id)}/publish", cancellationToken);
    }

    public async Task<ReceiptStatusResponse> GetReceiptStatusAsync(string electionId, string handle, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(electionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(handle);

        var url = $"/api/v1/elections/{Uri.EscapeDataString(electionId)}/receipts/{Uri.EscapeDataString(handle)}";
        var result = await SendJsonAsync<ReceiptStatusResponse>(HttpMethod.Get, url, null, cancellationToken);
        return result ?? throw new ApiException($"Receipt {handle} not found.", 404);
    }

    public async Task<PublishedResults> GetPublishedResultsAsync(string electionId, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(electionId);
        var url = $"/api/v1/elections/{Uri.EscapeDataString(electionId)}/results";
        var result = await SendJsonAsync<PublishedResults>(HttpMethod.Get, url, null, cancellationToken);
        return result ?? throw new ApiException($"Published results for {electionId} not available.", 404);
    }

    public async Task<string> PostAsync(string path, object body)
    {
        var json = JsonSerializer.Serialize(body, _jsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(path.TrimStart('/'), content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> GetAsync(string path)
    {
        using var response = await _httpClient.GetAsync(path.TrimStart('/'));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }

    public async Task<T?> PostAsync<T>(string path, object body) where T : class
    {
        var json = await PostAsync(path, body);
        return JsonSerializer.Deserialize<T>(json, _jsonOptions);
    }

    public async Task<T?> GetAsync<T>(string path) where T : class
    {
        var json = await GetAsync(path);
        return JsonSerializer.Deserialize<T>(json, _jsonOptions);
    }

    private async Task<T?> SendJsonAsync<T>(HttpMethod method, string path, object? body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path.TrimStart('/'));

        if (body != null)
        {
            var json = JsonSerializer.Serialize(body, _jsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ApiException($"HTTP {(int)response.StatusCode}: {errorContent}", (int)response.StatusCode);
        }

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(content))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(content, _jsonOptions);
    }

    private async Task SendRequestAsync(HttpMethod method, string path, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path.TrimStart('/'));
        using var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ApiException($"HTTP {(int)response.StatusCode}: {errorContent}", (int)response.StatusCode);
        }
    }
}
