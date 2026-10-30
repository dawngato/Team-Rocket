using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreElectionsViewModelTests
{
    [Fact]
    public async Task LoadElectionsAsync_Success_PopulatesAndFilters()
    {
        var mockApiClient = new Mock<IApiClient>();

        var list = new List<ElectionSummary>
        {
            new() { Id = "e1", Title = "Student Council", State = ElectionStates.Open },
            new() { Id = "e2", Title = "Faculty Senate", State = ElectionStates.Draft },
            new() { Id = "e3", Title = "Class Rep", State = ElectionStates.Closed }
        };

        mockApiClient.Setup(x => x.GetElectionsAsync(It.IsAny<CancellationToken>()))
                     .ReturnsAsync(list);

        var vm = new ElectionsViewModel(mockApiClient.Object);

        await vm.LoadElectionsAsync();

        Assert.Equal(3, vm.AllElections.Count);
        Assert.Equal(3, vm.FilteredElections.Count);

        // Filter to OPEN
        vm.FilterState = "OPEN";
        Assert.Single(vm.FilteredElections);
        Assert.Equal("Student Council", vm.FilteredElections[0].Title);

        // Filter to DRAFT
        vm.FilterState = "DRAFT";
        Assert.Single(vm.FilteredElections);
        Assert.Equal("Faculty Senate", vm.FilteredElections[0].Title);
    }
}
