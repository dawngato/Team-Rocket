using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreSettingsViewModelTests
{
    [Fact]
    public async Task CheckUpdatesAsync_QueriesUpdateService()
    {
        var mockUpdateService = new Mock<IUpdateService>();
        var mockSecureStore = new Mock<ISecureStore>();
        var mockApiClient = new Mock<IApiClient>();

        mockUpdateService.SetupGet(x => x.AppVersion).Returns("2.0.0");
        mockUpdateService.SetupGet(x => x.VerifierVersion).Returns("2.0.0");
        mockUpdateService.SetupGet(x => x.DistributionChannel).Returns("MSIX");
        mockApiClient.SetupGet(x => x.BaseUrl).Returns("http://localhost:8080");

        mockUpdateService.Setup(x => x.CheckForUpdatesAsync(It.IsAny<CancellationToken>()))
                         .ReturnsAsync(new UpdateInfo
                         {
                             IsUpdateAvailable = false,
                             CurrentVersion = "2.0.0"
                         });

        var vm = new SettingsViewModel(mockUpdateService.Object, mockSecureStore.Object, mockApiClient.Object);

        await vm.CheckUpdatesAsync();

        Assert.Contains("up to date", vm.StatusMessage);
        Assert.Null(vm.ErrorMessage);
    }

    [Fact]
    public async Task SaveSettingsAsync_PersistsNewBaseUrl()
    {
        var mockUpdateService = new Mock<IUpdateService>();
        var mockSecureStore = new Mock<ISecureStore>();
        var mockApiClient = new Mock<IApiClient>();

        mockUpdateService.SetupGet(x => x.AppVersion).Returns("2.0.0");
        mockUpdateService.SetupGet(x => x.VerifierVersion).Returns("2.0.0");
        mockUpdateService.SetupGet(x => x.DistributionChannel).Returns("MSIX");
        mockApiClient.SetupGet(x => x.BaseUrl).Returns("http://localhost:8080");

        var vm = new SettingsViewModel(mockUpdateService.Object, mockSecureStore.Object, mockApiClient.Object)
        {
            ApiBaseUrl = "https://voting.university.edu"
        };

        await vm.SaveSettingsAsync();

        mockApiClient.VerifySet(x => x.BaseUrl = "https://voting.university.edu", Times.Once);
        mockSecureStore.Verify(x => x.SetSecretAsync("setting_api_base_url", "https://voting.university.edu", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Settings saved successfully", vm.StatusMessage);
    }
}
