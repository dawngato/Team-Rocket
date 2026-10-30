using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class ApiClient : HimVote.Core.Services.ApiClient
{
    public ApiClient(string baseUrl = "http://localhost:8080", HttpClient? httpClient = null)
        : base(baseUrl, httpClient)
    {
    }
}
