using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class SecureStoreTests : IDisposable
{
    private readonly string _testRoot;

    public SecureStoreTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), "himvote_secure_test_" + Guid.NewGuid().ToString("N"));
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
    public async Task SetSecretAsync_AndGetSecretAsync_RoundTripsAccurately()
    {
        var store = new SecureStore(_testRoot);
        const string key = "api_session_token";
        const string secretValue = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.super_secure_token";

        await store.SetSecretAsync(key, secretValue);
        var retrieved = await store.GetSecretAsync(key);

        Assert.Equal(secretValue, retrieved);
        Assert.True(await store.HasSecretAsync(key));
    }

    [Fact]
    public async Task GetSecretAsync_NonExistentKey_ReturnsNull()
    {
        var store = new SecureStore(_testRoot);
        var result = await store.GetSecretAsync("non_existent_key");
        Assert.Null(result);
        Assert.False(await store.HasSecretAsync("non_existent_key"));
    }

    [Fact]
    public async Task RemoveSecretAsync_DeletesStoredFile()
    {
        var store = new SecureStore(_testRoot);
        const string key = "temporary_credential";

        await store.SetSecretAsync(key, "temp123");
        Assert.True(await store.HasSecretAsync(key));

        await store.RemoveSecretAsync(key);
        Assert.False(await store.HasSecretAsync(key));
        Assert.Null(await store.GetSecretAsync(key));
    }
}
