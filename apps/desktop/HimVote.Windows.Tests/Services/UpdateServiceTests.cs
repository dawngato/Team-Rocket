using System.Security.Cryptography;
using System.Text;
using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class UpdateServiceTests : IDisposable
{
    private readonly string _testRoot;

    public UpdateServiceTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), "himvote_update_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testRoot))
        {
            try
            {
                Directory.Delete(_testRoot, true);
            }
            catch
            {
            }
        }
    }

    [Fact]
    public async Task CheckForUpdatesAsync_ReturnsValidChannelAndVersion()
    {
        var service = new UpdateService();
        var update = await service.CheckForUpdatesAsync();

        Assert.NotNull(update);
        Assert.False(string.IsNullOrWhiteSpace(update.CurrentVersion));
        Assert.False(string.IsNullOrWhiteSpace(update.Channel));
        Assert.Equal(service.DistributionChannel, update.Channel);
    }

    [Fact]
    public async Task GetVerifierChecksumAsync_ExistingFile_ReturnsValidHexHash()
    {
        var service = new UpdateService();
        var testPath = Path.Combine(_testRoot, "mock_verifier_binary");
        await File.WriteAllTextAsync(testPath, "sample verifier binary payload");

        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("sample verifier binary payload"))).ToLowerInvariant();
        var actualHash = await service.GetVerifierChecksumAsync(testPath);

        Assert.Equal(expectedHash, actualHash);
    }

    [Fact]
    public async Task GetVerifierChecksumAsync_MissingFile_ReturnsUnavailable()
    {
        var service = new UpdateService();
        var actualHash = await service.GetVerifierChecksumAsync(Path.Combine(_testRoot, "does_not_exist"));

        Assert.Equal("UNAVAILABLE", actualHash);
    }
}
