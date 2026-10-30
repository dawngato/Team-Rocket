using System.Net;
using System.Text;
using System.Text.Json;
using HimVote.Windows.Models;
using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class MockHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

    public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
        _handler = handler;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_handler(request));
    }
}

public class ApiClientTests
{
    [Fact]
    public async Task LoginAsync_ValidCredentials_SetsBearerTokenAndReturnsSession()
    {
        var handler = new MockHttpMessageHandler(request =>
        {
            Assert.Contains("/v1/auth/login", request.RequestUri!.ToString());

            var payload = new
            {
                token = "jwt_token_sample_12345",
                user_id = "user_student_01",
                role = "ADMINISTRATOR",
                full_name = "Election Admin",
                expires_in_seconds = 7200
            };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
        });

        var client = new ApiClient(new HttpClient(handler));
        var session = await client.LoginAsync("admin@university.example.in", "password123");

        Assert.NotNull(session);
        Assert.Equal("jwt_token_sample_12345", session.BearerToken);
        Assert.Equal(UserRole.Administrator, session.Role);
        Assert.Equal("jwt_token_sample_12345", client.BearerToken);
    }

    [Fact]
    public async Task LoginAsync_InvalidCredentials_ThrowsApiException()
    {
        var handler = new MockHttpMessageHandler(request =>
        {
            return new HttpResponseMessage(HttpStatusCode.Unauthorized)
            {
                Content = new StringContent("{\"error\":\"invalid_credentials\"}", Encoding.UTF8, "application/json")
            };
        });

        var client = new ApiClient(new HttpClient(handler));
        var ex = await Assert.ThrowsAsync<ApiException>(() =>
            client.LoginAsync("bad@university.example.in", "wrongpass"));

        Assert.Equal(401, ex.StatusCode);
    }

    [Fact]
    public async Task GetElectionsAsync_ReturnsListOfElections()
    {
        var handler = new MockHttpMessageHandler(request =>
        {
            Assert.Contains("/v1/elections", request.RequestUri!.ToString());

            var payload = new[]
            {
                new ElectionSummary
                {
                    Id = "elec_001",
                    Title = "Student Union Election 2026",
                    State = "OPEN",
                    OpensAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
                    ClosesAtUtc = DateTimeOffset.UtcNow.AddDays(2)
                }
            };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
        });

        var client = new ApiClient(new HttpClient(handler));
        var elections = await client.GetElectionsAsync();

        Assert.Single(elections);
        Assert.Equal("elec_001", elections[0].Id);
        Assert.Equal("Student Union Election 2026", elections[0].Title);
    }

    [Fact]
    public async Task GetReceiptStatusAsync_ReturnsReceiptInformation()
    {
        var handler = new MockHttpMessageHandler(request =>
        {
            Assert.Contains("/v1/cast/elec_001/receipts/handle_xyz", request.RequestUri!.ToString());

            var payload = new ReceiptStatusResponse
            {
                Status = "WITNESSED",
                Handle = "handle_xyz",
                LeafIndex = 14,
                WitnessedAtUtc = DateTimeOffset.UtcNow
            };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
        });

        var client = new ApiClient(new HttpClient(handler));
        var receipt = await client.GetReceiptStatusAsync("elec_001", "handle_xyz");

        Assert.Equal("WITNESSED", receipt.Status);
        Assert.Equal(14, receipt.LeafIndex);
    }
}
