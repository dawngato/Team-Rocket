using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class CandidatesViewModelTests
{
    [Fact]
    public async Task LoadCandidatesAsync_ValidElection_PopulatesCandidatesList()
    {
        var mockApi = new Mock<IApiClient>();
        var sampleElection = new Election
        {
            Id = "elec_exec_01",
            Title = "Executive Committee Election",
            Candidates = new List<Candidate>
            {
                new() { Id = "cand_1", Name = "Alice Walker", Contest = "President" },
                new() { Id = "cand_2", Name = "Bob Stone", Contest = "President" }
            }
        };

        mockApi.Setup(x => x.GetElectionByIdAsync("elec_exec_01", It.IsAny<CancellationToken>()))
               .ReturnsAsync(sampleElection);

        var vm = new CandidatesViewModel(mockApi.Object);
        await vm.LoadCandidatesAsync("elec_exec_01");

        Assert.Equal("elec_exec_01", vm.ElectionId);
        Assert.Equal("Executive Committee Election", vm.ElectionTitle);
        Assert.Equal(2, vm.Candidates.Count);
        Assert.Equal("Alice Walker", vm.Candidates[0].Name);
    }

    [Fact]
    public async Task LoadCandidatesAsync_EmptyElectionId_SetsErrorMessage()
    {
        var mockApi = new Mock<IApiClient>();
        var vm = new CandidatesViewModel(mockApi.Object);

        await vm.LoadCandidatesAsync("");

        Assert.Equal("Election ID is required to load candidates.", vm.ErrorMessage);
    }
}
