using System.Security;
using System.Text.Json;
using HimVote.Windows.Models;
using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class TrustPinStoreTests : IDisposable
{
    private readonly string _testRoot;

    public TrustPinStoreTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), "himvote_trust_test_" + Guid.NewGuid().ToString("N"));
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
    public async Task ImportFromFileAsync_ValidExternalFile_LoadsSuccessfully()
    {
        var storePath = Path.Combine(_testRoot, "store.json");
        var externalPinPath = Path.Combine(_testRoot, "external_pins.json");

        var samplePins = new TrustPins
        {
            ManifestDigest = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            WitnessPublicKey = "ed25519:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
            AuthorityPublicKey = "ed25519:111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000",
            ContractAddress = "0x1234567890123456789012345678901234567890",
            ChainId = 1337,
            ContractCodeHash = "sha256:fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
            FinalCheckpointDigest = "sha256:cafebabe0123456789abcdef0123456789abcdef0123456789abcdef01234567"
        };

        await File.WriteAllTextAsync(externalPinPath, JsonSerializer.Serialize(samplePins));

        var store = new TrustPinStore(storePath);
        var loaded = await store.ImportFromFileAsync(externalPinPath);

        Assert.NotNull(loaded);
        Assert.Equal(samplePins.ManifestDigest, loaded.ManifestDigest);
        Assert.Equal(samplePins.WitnessPublicKey, loaded.WitnessPublicKey);
        Assert.Equal(1337, loaded.ChainId);
        Assert.NotNull(store.CurrentPins);
    }

    [Fact]
    public async Task ImportFromFileAsync_PinFileInsideArchiveDirectory_ThrowsSecurityException()
    {
        var storePath = Path.Combine(_testRoot, "store.json");
        var archiveDir = Path.Combine(_testRoot, "extracted_archive");
        Directory.CreateDirectory(archiveDir);

        var internalPinPath = Path.Combine(archiveDir, "pins_inside_archive.json");
        var samplePins = new TrustPins
        {
            ManifestDigest = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            WitnessPublicKey = "ed25519:key",
            AuthorityPublicKey = "ed25519:auth"
        };
        await File.WriteAllTextAsync(internalPinPath, JsonSerializer.Serialize(samplePins));

        var store = new TrustPinStore(storePath);

        var exception = await Assert.ThrowsAsync<SecurityException>(() =>
            store.ImportFromFileAsync(internalPinPath, archiveDir));

        Assert.Contains("never from inside the imported evidence archive", exception.Message);
    }

    [Fact]
    public async Task ImportFromFileAsync_MissingRequiredFields_ThrowsArgumentException()
    {
        var storePath = Path.Combine(_testRoot, "store.json");
        var pinPath = Path.Combine(_testRoot, "invalid_pins.json");

        var invalidPins = new TrustPins
        {
            ManifestDigest = "",
            WitnessPublicKey = "key"
        };
        await File.WriteAllTextAsync(pinPath, JsonSerializer.Serialize(invalidPins));

        var store = new TrustPinStore(storePath);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            store.ImportFromFileAsync(pinPath));
    }

    [Fact]
    public async Task SavePinsAsync_AndLoadSavedPinsAsync_PersistsProperly()
    {
        var storePath = Path.Combine(_testRoot, "store_persist.json");
        var store = new TrustPinStore(storePath);

        var samplePins = new TrustPins
        {
            ManifestDigest = "sha256:manifest123",
            WitnessPublicKey = "ed25519:witness123",
            AuthorityPublicKey = "ed25519:auth123"
        };

        await store.SavePinsAsync(samplePins);

        var secondStoreInstance = new TrustPinStore(storePath);
        var loaded = await secondStoreInstance.LoadSavedPinsAsync();

        Assert.NotNull(loaded);
        Assert.Equal("sha256:manifest123", loaded.ManifestDigest);

        secondStoreInstance.Clear();
        var afterClear = await secondStoreInstance.LoadSavedPinsAsync();
        Assert.Null(afterClear);
    }

    [Fact]
    public async Task LoadSavedPinsAsync_InvalidPersistedPins_DoesNotTrustOrRetainThem()
    {
        var storePath = Path.Combine(_testRoot, "invalid_store.json");
        await File.WriteAllTextAsync(storePath, "{\"ManifestDigest\":\"\",\"WitnessPublicKey\":\"stale\",\"AuthorityPublicKey\":\"stale\"}");

        var store = new TrustPinStore(storePath);
        var loaded = await store.LoadSavedPinsAsync();

        Assert.Null(loaded);
        Assert.Null(store.CurrentPins);
    }
}
