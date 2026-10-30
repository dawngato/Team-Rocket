using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class ElectionsViewModelTests
{
    [Fact]
    public async Task LoadElectionsAsync_PopulatesCollections()
    {
        var mockApi = new Mock<IApiClient>();
        var sampleList = new List<ElectionSummary>
        {
            new() { Id = "elec_1", Title = "Campus Senate", State = "OPEN" },
            new() { Id = "elec_2", Title = "Faculty Board", State = "CLOSED" }
        };

        mockApi.Setup(x => x.GetElectionsAsync(It.IsAny<CancellationToken>()))
               .ReturnsAsync(sampleList);

        var vm = new ElectionsViewModel(mockApi.Object);
        await vm.LoadElectionsAsync();

        Assert.Equal(2, vm.AllElections.Count);
        Assert.Equal(2, vm.FilteredElections.Count);
    }

    [Fact]
    public async Task FilterState_FiltersCorrectly()
    {
        var mockApi = new Mock<IApiClient>();
        var sampleList = new List<ElectionSummary>
        {
            new() { Id = "elec_1", Title = "Campus Senate", State = "OPEN" },
            new() { Id = "elec_2", Title = "Faculty Board", State = "CLOSED" }
        };

        mockApi.Setup(x => x.GetElectionsAsync(It.IsAny<CancellationToken>()))
               .ReturnsAsync(sampleList);

        var vm = new ElectionsViewModel(mockApi.Object);
        await vm.LoadElectionsAsync();

        vm.FilterState = "OPEN";
        Assert.Single(vm.FilteredElections);
        Assert.Equal("elec_1", vm.FilteredElections[0].Id);

        vm.FilterState = "CLOSED";
        Assert.Single(vm.FilteredElections);
        Assert.Equal("elec_2", vm.FilteredElections[0].Id);
    }
}
