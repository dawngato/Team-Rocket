using HimVote.Core.Services;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class CoreUpdateServiceTests
{
    [Fact]
    public async Task CheckForUpdatesAsync_ReturnsUpdateInfo()
    {
        var service = new UpdateService();
        var info = await service.CheckForUpdatesAsync();

        Assert.NotNull(info);
        Assert.Equal("2.0.0", info.CurrentVersion);
        Assert.False(info.IsUpdateAvailable);
    }

    [Fact]
    public async Task GetVerifierChecksumAsync_MissingFile_ReturnsEmpty()
    {
        var service = new UpdateService();
        var checksum = await service.GetVerifierChecksumAsync("/does/not/exist.py");

        Assert.Equal(string.Empty, checksum);
    }
}
