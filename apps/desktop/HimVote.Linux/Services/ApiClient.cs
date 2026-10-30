using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HimVote.Core.Models;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class ApiClient : IApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public ApiClient(string baseUrl)
    {
        _baseUrl = baseUrl;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<string> PostAsync(string path, object body)
    {
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{_baseUrl}{path}", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> GetAsync(string path)
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}{path}");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }

    public async Task<T?> PostAsync<T>(string path, object body) where T : class
    {
        var json = await PostAsync(path, body);
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    public async Task<T?> GetAsync<T>(string path) where T : class
    {
        var json = await GetAsync(path);
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }
}