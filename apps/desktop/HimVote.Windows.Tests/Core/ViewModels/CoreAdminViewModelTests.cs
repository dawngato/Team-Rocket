using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreAdminViewModelTests
{
    [Fact]
    public async Task CreateElectionAsync_ValidTitle_CreatesAndRefreshes()
    {
        var mockApiClient = new Mock<IApiClient>();

        var created = new Election
        {
            Id = "elec_new_001",
            Title = "2026 Student Council",
            State = ElectionStates.Draft
        };

        mockApiClient.Setup(x => x.CreateElectionAsync(It.IsAny<CreateElectionRequest>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(created);

        mockApiClient.Setup(x => x.GetElectionsAsync(It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new List<ElectionSummary>
                     {
                         new() { Id = "elec_new_001", Title = "2026 Student Council", State = ElectionStates.Draft }
                     });

        var vm = new AdminViewModel(mockApiClient.Object)
        {
            NewElectionTitle = "2026 Student Council",
            Contest = "President",
            MinAnonymousTurnout = 15
        };

        await vm.CreateElectionAsync();

        Assert.Equal(string.Empty, vm.NewElectionTitle);
        Assert.Single(vm.ManagedElections);
        Assert.Contains("Created election draft", vm.StatusMessage);
        Assert.Null(vm.ErrorMessage);
    }

    [Fact]
    public async Task FreezeElectionAsync_WithId_CallsFreezeApi()
    {
        var mockApiClient = new Mock<IApiClient>();

        mockApiClient.Setup(x => x.FreezeElectionAsync("elec_001", It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new Election { Id = "elec_001", Title = "President", State = ElectionStates.RosterFrozen });

        var vm = new AdminViewModel(mockApiClient.Object);
        await vm.FreezeElectionAsync("elec_001");

        mockApiClient.Verify(x => x.FreezeElectionAsync("elec_001", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Roster frozen", vm.StatusMessage);
    }

    [Fact]
    public async Task OpenElectionAsync_WithId_CallsOpenApi()
    {
        var mockApiClient = new Mock<IApiClient>();

        mockApiClient.Setup(x => x.OpenElectionAsync("elec_001", It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new Election { Id = "elec_001", Title = "President", State = ElectionStates.Open });

        var vm = new AdminViewModel(mockApiClient.Object);
        await vm.OpenElectionAsync("elec_001");

        mockApiClient.Verify(x => x.OpenElectionAsync("elec_001", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Election opened", vm.StatusMessage);
    }

    [Fact]
    public async Task CloseElectionAsync_WithId_CallsCloseApi()
    {
        var mockApiClient = new Mock<IApiClient>();

        mockApiClient.Setup(x => x.CloseElectionAsync("elec_001", It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new Election { Id = "elec_001", Title = "President", State = ElectionStates.Closed });

        var vm = new AdminViewModel(mockApiClient.Object);
        await vm.CloseElectionAsync("elec_001");

        mockApiClient.Verify(x => x.CloseElectionAsync("elec_001", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Election closed", vm.StatusMessage);
    }
}
