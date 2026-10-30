using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class SettingsViewModelTests
{
    [Fact]
    public async Task CheckUpdatesAsync_InvokesUpdateService()
    {
        var mockUpdate = new Mock<IUpdateService>();
        var mockStore = new Mock<ISecureStore>();
        var mockApi = new Mock<IApiClient>();

        mockUpdate.SetupGet(x => x.AppVersion).Returns("2.0.0");
        mockUpdate.SetupGet(x => x.VerifierVersion).Returns("2.0.0");
        mockUpdate.SetupGet(x => x.DistributionChannel).Returns("Enterprise MSIX");
        mockApi.SetupProperty(x => x.BaseUrl, "http://localhost:8080");

        mockUpdate.Setup(x => x.CheckForUpdatesAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new UpdateInfo
                  {
                      IsUpdateAvailable = false,
                      CurrentVersion = "2.0.0",
                      LatestVersion = "2.0.0",
                      Channel = "Enterprise MSIX"
                  });

        var vm = new SettingsViewModel(mockUpdate.Object, mockStore.Object, mockApi.Object);
        await vm.CheckUpdatesAsync();

        mockUpdate.Verify(x => x.CheckForUpdatesAsync(It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Client is up to date", vm.StatusMessage);
    }

    [Fact]
    public async Task SaveSettingsAsync_PersistsBaseUrl()
    {
        var mockUpdate = new Mock<IUpdateService>();
        var mockStore = new Mock<ISecureStore>();
        var mockApi = new Mock<IApiClient>();

        mockUpdate.SetupGet(x => x.AppVersion).Returns("2.0.0");
        mockUpdate.SetupGet(x => x.VerifierVersion).Returns("2.0.0");
        mockUpdate.SetupGet(x => x.DistributionChannel).Returns("Enterprise MSIX");
        mockApi.SetupProperty(x => x.BaseUrl, "http://localhost:8080");

        var vm = new SettingsViewModel(mockUpdate.Object, mockStore.Object, mockApi.Object)
        {
            ApiBaseUrl = "https://api.himvote.university.edu"
        };

        await vm.SaveSettingsAsync();

        Assert.Equal("https://api.himvote.university.edu", mockApi.Object.BaseUrl);
        mockStore.Verify(x => x.SetSecretAsync("setting_api_base_url", "https://api.himvote.university.edu", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Equal("Settings saved successfully.", vm.StatusMessage);
    }
}
