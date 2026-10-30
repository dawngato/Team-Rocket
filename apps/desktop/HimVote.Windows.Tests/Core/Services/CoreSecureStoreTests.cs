using HimVote.Core.Services;
using HimVote.Linux.Services;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class CoreSecureStoreTests : IDisposable
{
    private readonly string _testRoot;
    private readonly string _coreStorePath;
    private readonly string _linuxStorePath;

    public CoreSecureStoreTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"himvote_secure_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testRoot);
        _coreStorePath = Path.Combine(_testRoot, "core_store.enc");
        _linuxStorePath = Path.Combine(_testRoot, "linux_store.bin");
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
    public async Task CrossPlatformSecureStore_SetAndGet_PersistsEncryptedSecret()
    {
        var store = new CrossPlatformSecureStore(_coreStorePath);

        await store.SetSecretAsync("auth_token", "jwt_token_secret_123");
        var retrieved = await store.GetSecretAsync("auth_token");
        var has = await store.HasSecretAsync("auth_token");

        Assert.Equal("jwt_token_secret_123", retrieved);
        Assert.True(has);

        // Verify the file on disk is encrypted (does not contain plaintext secret)
        var rawBytes = await File.ReadAllBytesAsync(_coreStorePath);
        var rawText = System.Text.Encoding.UTF8.GetString(rawBytes);
        Assert.DoesNotContain("jwt_token_secret_123", rawText);

        await store.RemoveSecretAsync("auth_token");
        var afterRemove = await store.GetSecretAsync("auth_token");
        Assert.Null(afterRemove);
    }

    [Fact]
    public async Task LinuxSecureStore_SetAndGet_PersistsSecret()
    {
        var store = new LinuxSecureStore(_linuxStorePath);

        await store.SetSecretAsync("voter_session", "session_cookie_abc");
        var retrieved = await store.GetSecretAsync("voter_session");
        var has = await store.HasSecretAsync("voter_session");

        Assert.Equal("session_cookie_abc", retrieved);
        Assert.True(has);

        await store.RemoveSecretAsync("voter_session");
        var afterRemove = await store.GetSecretAsync("voter_session");
        Assert.Null(afterRemove);
    }
}
