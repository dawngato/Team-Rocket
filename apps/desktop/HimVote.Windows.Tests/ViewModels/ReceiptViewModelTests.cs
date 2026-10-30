using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class ReceiptViewModelTests
{
    [Fact]
    public async Task TrackReceiptAsync_FoundReceipt_PopulatesProperties()
    {
        var mockApi = new Mock<IApiClient>();
        var sampleResponse = new ReceiptStatusResponse
        {
            Status = "WITNESSED",
            Handle = "handle_123",
            LeafIndex = 7,
            WitnessedAtUtc = DateTimeOffset.UtcNow
        };

        mockApi.Setup(x => x.GetReceiptStatusAsync("elec_1", "handle_123", It.IsAny<CancellationToken>()))
               .ReturnsAsync(sampleResponse);

        var vm = new ReceiptViewModel(mockApi.Object)
        {
            ElectionId = "elec_1",
            ReceiptHandle = "handle_123"
        };

        await vm.TrackReceiptAsync();

        Assert.True(vm.IsFound);
        Assert.Equal("WITNESSED", vm.Status);
        Assert.Equal(7, vm.LeafIndex);
        Assert.Null(vm.ErrorMessage);
    }

    [Fact]
    public async Task TrackReceiptAsync_MissingFields_SetsErrorMessage()
    {
        var mockApi = new Mock<IApiClient>();
        var vm = new ReceiptViewModel(mockApi.Object)
        {
            ElectionId = "",
            ReceiptHandle = ""
        };

        await vm.TrackReceiptAsync();

        Assert.False(vm.IsFound);
        Assert.Equal("Both Election ID and Receipt Handle are required to verify inclusion.", vm.ErrorMessage);
    }
}
