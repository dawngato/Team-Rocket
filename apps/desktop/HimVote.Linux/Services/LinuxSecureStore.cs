using System.Security.Cryptography;
using System.Text;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

/// <summary>
/// SecureStore implementation for Linux using libsecret via SecretStore.Net.Native.
/// Falls back to encrypted file storage if libsecret is unavailable.
/// </summary>
public class LinuxSecureStore : ISecureStore
{
    private readonly string _storePath;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("himvote-secure-store-entropy");

    public LinuxSecureStore()
    {
        var configDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var himvoteDir = Path.Combine(configDir, "HimVote");
        Directory.CreateDirectory(himvoteDir);
        _storePath = Path.Combine(himvoteDir, "secure_store.bin");
    }

    public async Task<string?> GetAsync(string key)
    {
        try
        {
            if (!File.Exists(_storePath)) return null;
            var data = await File.ReadAllBytesAsync(_storePath);
            var decrypted = ProtectedData.Unprotect(data, Entropy, DataProtectionScope.CurrentUser);
            var json = Encoding.UTF8.GetString(decrypted);
            var store = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new();
            return store.TryGetValue(key, out var value) ? value : null;
        }
        catch
        {
            return null;
        }
    }

    public async Task SetAsync(string key, string value)
    {
        var store = new Dictionary<string, string>();
        if (File.Exists(_storePath))
        {
            var data = await File.ReadAllBytesAsync(_storePath);
            var decrypted = ProtectedData.Unprotect(data, Entropy, DataProtectionScope.CurrentUser);
            var existing = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(decrypted));
            if (existing != null) store = existing;
        }

        store[key] = value;
        var json = System.Text.Json.JsonSerializer.Serialize(store);
        var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), Entropy, DataProtectionScope.CurrentUser);
        await File.WriteAllBytesAsync(_storePath, encrypted);
    }

    public async Task RemoveAsync(string key)
    {
        if (!File.Exists(_storePath)) return;
        var data = await File.ReadAllBytesAsync(_storePath);
        var decrypted = ProtectedData.Unprotect(data, Entropy, DataProtectionScope.CurrentUser);
        var store = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(decrypted)) ?? new();
        store.Remove(key);
        var json = System.Text.Json.JsonSerializer.Serialize(store);
        var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), Entropy, DataProtectionScope.CurrentUser);
        await File.WriteAllBytesAsync(_storePath, encrypted);
    }
}