using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreCandidatesViewModelTests
{
    [Fact]
    public async Task LoadCandidatesAsync_Success_PopulatesCandidatesList()
    {
        var mockApiClient = new Mock<IApiClient>();

        var election = new Election
        {
            Id = "elec_core",
            Title = "2026 Presidential Contest",
            Candidates = new List<Candidate>
            {
                new() { Id = "c1", Name = "Alice", Contest = "President" },
                new() { Id = "c2", Name = "Bob", Contest = "President" }
            }
        };

        mockApiClient.Setup(x => x.GetElectionByIdAsync("elec_core", It.IsAny<CancellationToken>()))
                     .ReturnsAsync(election);

        var vm = new CandidatesViewModel(mockApiClient.Object)
        {
            ElectionId = "elec_core"
        };

        await vm.LoadCandidatesAsync(null);

        Assert.Equal("2026 Presidential Contest", vm.ElectionTitle);
        Assert.Equal(2, vm.Candidates.Count);
        Assert.Equal("Alice", vm.Candidates[0].Name);
        Assert.Null(vm.ErrorMessage);
    }
}
