using System.Security;
using System.Text.Json;
using HimVote.Core.Models;
using HimVote.Core.Services;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class CoreTrustPinStoreTests : IDisposable
{
    private readonly string _testRoot;
    private readonly string _storeFile;

    public CoreTrustPinStoreTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"himvote_core_pins_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testRoot);
        _storeFile = Path.Combine(_testRoot, "pins.json");
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testRoot))
            {
                Directory.Delete(_testRoot, recursive: true);
            }
        }
        catch
        {
        }
    }

    [Fact]
    public async Task ImportFromFileAsync_ValidExternalFile_ImportsSuccessfully()
    {
        var externalPinFile = Path.Combine(_testRoot, "external_trust.json");
        var pins = new TrustPins
        {
            ManifestDigest = "sha256:1111222233334444",
            WitnessPublicKey = "pub_witness_key_abc",
            AuthorityPublicKey = "pub_auth_key_xyz",
            ContractAddress = "0x1234567890123456789012345678901234567890",
            ChainId = 1337
        };

        await File.WriteAllTextAsync(externalPinFile, JsonSerializer.Serialize(pins));

        var store = new TrustPinStore(_storeFile);
        var imported = await store.ImportFromFileAsync(externalPinFile, forbiddenArchiveDirectory: Path.Combine(_testRoot, "evidence_dir"));

        Assert.NotNull(imported);
        Assert.Equal("sha256:1111222233334444", imported.ManifestDigest);
        Assert.Equal("pub_witness_key_abc", imported.WitnessPublicKey);
        Assert.Equal("pub_auth_key_xyz", imported.AuthorityPublicKey);
        Assert.NotNull(store.CurrentPins);
    }

    [Fact]
    public async Task ImportFromFileAsync_InsideForbiddenArchiveDirectory_ThrowsSecurityException()
    {
        var evidenceDir = Path.Combine(_testRoot, "imported_evidence");
        Directory.CreateDirectory(evidenceDir);

        var trappedPinFile = Path.Combine(evidenceDir, "trust_pins.json");
        var pins = new TrustPins
        {
            ManifestDigest = "sha256:attacker_root",
            WitnessPublicKey = "pub_witness",
            AuthorityPublicKey = "pub_auth"
        };
        await File.WriteAllTextAsync(trappedPinFile, JsonSerializer.Serialize(pins));

        var store = new TrustPinStore(_storeFile);

        await Assert.ThrowsAsync<SecurityException>(() =>
            store.ImportFromFileAsync(trappedPinFile, forbiddenArchiveDirectory: evidenceDir));
    }

    [Fact]
    public async Task ImportFromFileAsync_MissingManifestDigest_ThrowsArgumentException()
    {
        var pinFile = Path.Combine(_testRoot, "invalid_pins.json");
        var pins = new TrustPins
        {
            ManifestDigest = "",
            WitnessPublicKey = "pub_witness",
            AuthorityPublicKey = "pub_auth"
        };
        await File.WriteAllTextAsync(pinFile, JsonSerializer.Serialize(pins));

        var store = new TrustPinStore(_storeFile);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            store.ImportFromFileAsync(pinFile));
    }

    [Fact]
    public async Task Clear_RemovesSavedPins()
    {
        var store = new TrustPinStore(_storeFile);
        var pins = new TrustPins
        {
            ManifestDigest = "sha256:test",
            WitnessPublicKey = "pub_witness",
            AuthorityPublicKey = "pub_auth"
        };

        await store.SavePinsAsync(pins);
        Assert.True(File.Exists(_storeFile));

        store.Clear();
        Assert.Null(store.CurrentPins);
        Assert.False(File.Exists(_storeFile));
    }

    [Fact]
    public async Task LoadSavedPinsAsync_InvalidPersistedPins_DoesNotTrustOrRetainThem()
    {
        await File.WriteAllTextAsync(_storeFile, "{\"ManifestDigest\":\"\",\"WitnessPublicKey\":\"stale\",\"AuthorityPublicKey\":\"stale\"}");

        var store = new TrustPinStore(_storeFile);
        var loaded = await store.LoadSavedPinsAsync();

        Assert.Null(loaded);
        Assert.Null(store.CurrentPins);
    }
}
