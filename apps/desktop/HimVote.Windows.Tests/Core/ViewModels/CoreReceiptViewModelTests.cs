using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreReceiptViewModelTests
{
    [Fact]
    public async Task TrackReceiptAsync_Found_PopulatesReceiptStatus()
    {
        var mockApiClient = new Mock<IApiClient>();

        mockApiClient.Setup(x => x.GetReceiptStatusAsync("elec_001", "handle_123", It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new ReceiptStatusResponse
                     {
                         Status = ReceiptStatuses.Witnessed,
                         Handle = "handle_123",
                         LeafIndex = 42,
                         WitnessedAtUtc = DateTimeOffset.UtcNow
                     });

        var vm = new ReceiptViewModel(mockApiClient.Object)
        {
            ElectionId = "elec_001",
            ReceiptHandle = "handle_123"
        };

        await vm.TrackReceiptAsync();

        Assert.True(vm.IsFound);
        Assert.Equal(ReceiptStatuses.Witnessed, vm.Status);
        Assert.Equal(42, vm.LeafIndex);
        Assert.NotNull(vm.Receipt);
        Assert.Null(vm.ErrorMessage);
    }

    [Fact]
    public async Task TrackReceiptAsync_NotFound_SetsRejectedStatus()
    {
        var mockApiClient = new Mock<IApiClient>();

        mockApiClient.Setup(x => x.GetReceiptStatusAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                     .ThrowsAsync(new ApiException("Not found", 404));

        var vm = new ReceiptViewModel(mockApiClient.Object)
        {
            ElectionId = "elec_001",
            ReceiptHandle = "missing_handle"
        };

        await vm.TrackReceiptAsync();

        Assert.False(vm.IsFound);
        Assert.Equal(ReceiptStatuses.Rejected, vm.Status);
        Assert.NotNull(vm.ErrorMessage);
    }
}
