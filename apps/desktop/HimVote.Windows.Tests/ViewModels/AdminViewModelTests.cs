using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class AdminViewModelTests
{
    [Fact]
    public async Task CreateElectionAsync_ValidTitle_CallsApiAndRefreshes()
    {
        var mockApi = new Mock<IApiClient>();

        mockApi.Setup(x => x.CreateElectionAsync(It.IsAny<CreateElectionRequest>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(new Election
               {
                   Id = "elec_new_01",
                   Title = "New Student Council Election",
                   State = "DRAFT"
               });

        mockApi.Setup(x => x.GetElectionsAsync(It.IsAny<CancellationToken>()))
               .ReturnsAsync(new List<ElectionSummary>
               {
                   new() { Id = "elec_new_01", Title = "New Student Council Election", State = "DRAFT" }
               });

        var vm = new AdminViewModel(mockApi.Object)
        {
            NewElectionTitle = "New Student Council Election"
        };

        await vm.CreateElectionAsync();

        mockApi.Verify(x => x.CreateElectionAsync(It.IsAny<CreateElectionRequest>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.Single(vm.ManagedElections);
        Assert.Contains("Created election draft", vm.StatusMessage);
    }

    [Fact]
    public async Task FreezeElectionAsync_CallsFreezeApi()
    {
        var mockApi = new Mock<IApiClient>();
        mockApi.Setup(x => x.FreezeElectionAsync("elec_123", It.IsAny<CancellationToken>()))
               .ReturnsAsync(new Election { Id = "elec_123", Title = "Test Election", State = "ROSTER_FROZEN" });

        var vm = new AdminViewModel(mockApi.Object);
        await vm.FreezeElectionAsync("elec_123");

        mockApi.Verify(x => x.FreezeElectionAsync("elec_123", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Roster frozen", vm.StatusMessage);
    }
}
