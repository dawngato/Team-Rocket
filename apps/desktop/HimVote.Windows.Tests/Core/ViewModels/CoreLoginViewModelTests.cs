using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreLoginViewModelTests
{
    [Fact]
    public async Task LoginAsync_ValidCredentials_SignsInAndPersistsToken()
    {
        var mockApiClient = new Mock<IApiClient>();
        var mockSecureStore = new Mock<ISecureStore>();

        var session = new UserSession
        {
            Email = "student@hptu.edu",
            FullName = "Jane Doe",
            Role = UserRole.Student,
            BearerToken = "token_jwt_xyz",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(2)
        };

        mockApiClient.Setup(x => x.LoginAsync("student@hptu.edu", "secretpass", null, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(session);

        var vm = new LoginViewModel(mockApiClient.Object, mockSecureStore.Object)
        {
            Email = "student@hptu.edu",
            Password = "secretpass"
        };

        await vm.LoginAsync();

        Assert.True(vm.IsLoggedIn);
        Assert.Equal("Jane Doe", vm.CurrentUser?.FullName);
        mockSecureStore.Verify(x => x.SetSecretAsync("session_bearer_token", "token_jwt_xyz", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Signed in successfully", vm.StatusMessage);
    }

    [Fact]
    public async Task LogoutAsync_ClearsSessionAndToken()
    {
        var mockApiClient = new Mock<IApiClient>();
        var mockSecureStore = new Mock<ISecureStore>();

        var vm = new LoginViewModel(mockApiClient.Object, mockSecureStore.Object);

        await vm.LogoutAsync();

        Assert.False(vm.IsLoggedIn);
        Assert.Null(vm.CurrentUser);
        mockSecureStore.Verify(x => x.RemoveSecretAsync("session_bearer_token", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Equal("Logged out.", vm.StatusMessage);
    }
}
