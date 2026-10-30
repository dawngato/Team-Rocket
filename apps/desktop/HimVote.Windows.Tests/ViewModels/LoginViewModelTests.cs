using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class LoginViewModelTests
{
    [Fact]
    public async Task LoginAsync_ValidInputs_SavesSessionToSecureStore()
    {
        var mockApi = new Mock<IApiClient>();
        var mockStore = new Mock<ISecureStore>();

        var expectedSession = new UserSession
        {
            UserId = "user_123",
            Email = "student@university.example.in",
            FullName = "Jane Doe",
            Role = UserRole.Student,
            BearerToken = "token_xyz",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1)
        };

        mockApi.Setup(x => x.LoginAsync("student@university.example.in", "secret123", null, It.IsAny<CancellationToken>()))
               .ReturnsAsync(expectedSession);

        var vm = new LoginViewModel(mockApi.Object, mockStore.Object)
        {
            Email = "student@university.example.in",
            Password = "secret123"
        };

        await vm.LoginAsync();

        Assert.True(vm.IsLoggedIn);
        Assert.NotNull(vm.CurrentUser);
        Assert.Equal("Jane Doe", vm.CurrentUser.FullName);
        mockStore.Verify(x => x.SetSecretAsync("session_bearer_token", "token_xyz", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_MissingPassword_SetsErrorMessage()
    {
        var mockApi = new Mock<IApiClient>();
        var mockStore = new Mock<ISecureStore>();

        var vm = new LoginViewModel(mockApi.Object, mockStore.Object)
        {
            Email = "student@university.example.in",
            Password = ""
        };

        await vm.LoginAsync();

        Assert.False(vm.IsLoggedIn);
        Assert.Equal("Email and password are required.", vm.ErrorMessage);
    }

    [Fact]
    public async Task LogoutAsync_ClearsSessionAndStore()
    {
        var mockApi = new Mock<IApiClient>();
        var mockStore = new Mock<ISecureStore>();

        var vm = new LoginViewModel(mockApi.Object, mockStore.Object);
        await vm.LogoutAsync();

        Assert.False(vm.IsLoggedIn);
        Assert.Null(vm.CurrentUser);
        mockStore.Verify(x => x.RemoveSecretAsync("session_bearer_token", It.IsAny<CancellationToken>()), Times.Once);
    }
}
