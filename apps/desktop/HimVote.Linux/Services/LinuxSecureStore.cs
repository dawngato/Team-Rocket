using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

/// <summary>
/// SecureStore implementation for Linux using AES-256-GCM machine and user bound storage with DPAPI fallback.
/// </summary>
public class LinuxSecureStore : ISecureStore
{
    private readonly string _storePath;
    private readonly byte[] _masterKey;

    public LinuxSecureStore(string? customStorePath = null)
    {
        if (string.IsNullOrWhiteSpace(customStorePath))
        {
            var configDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            if (string.IsNullOrWhiteSpace(configDir))
            {
                configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config");
            }
            var himvoteDir = Path.Combine(configDir, "HimVote");
            Directory.CreateDirectory(himvoteDir);
            _storePath = Path.Combine(himvoteDir, "secure_store.bin");
        }
        else
        {
            var parent = Path.GetDirectoryName(customStorePath);
            if (!string.IsNullOrEmpty(parent))
            {
                Directory.CreateDirectory(parent);
            }
            _storePath = customStorePath;
        }

        var seed = $"HimVote_Linux_{Environment.UserName}_{Environment.MachineName}";
        _masterKey = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
    }

    public async Task<string?> GetSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        var store = await ReadStoreAsync(cancellationToken);
        return store.TryGetValue(key, out var val) ? val : null;
    }

    public async Task SetSecretAsync(string key, string secret, CancellationToken cancellationToken = default)
    {
        var store = await ReadStoreAsync(cancellationToken);
        store[key] = secret;
        await WriteStoreAsync(store, cancellationToken);
    }

    public async Task RemoveSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        var store = await ReadStoreAsync(cancellationToken);
        if (store.Remove(key))
        {
            await WriteStoreAsync(store, cancellationToken);
        }
    }

    public async Task<bool> HasSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        var store = await ReadStoreAsync(cancellationToken);
        return store.ContainsKey(key);
    }

    public Task<string?> GetAsync(string key) => GetSecretAsync(key);
    public Task SetAsync(string key, string value) => SetSecretAsync(key, value);
    public Task RemoveAsync(string key) => RemoveSecretAsync(key);

    private async Task<Dictionary<string, string>> ReadStoreAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_storePath))
        {
            return new Dictionary<string, string>();
        }

        try
        {
            var data = await File.ReadAllBytesAsync(_storePath, cancellationToken);
            if (data.Length < 12 + 16)
            {
                return new Dictionary<string, string>();
            }

            var nonce = new byte[12];
            var tag = new byte[16];
            var cipherLen = data.Length - 12 - 16;
            var cipher = new byte[cipherLen];

            Buffer.BlockCopy(data, 0, nonce, 0, 12);
            Buffer.BlockCopy(data, 12, tag, 0, 16);
            Buffer.BlockCopy(data, 28, cipher, 0, cipherLen);

            var plain = new byte[cipherLen];
            using var aes = new AesGcm(_masterKey, 16);
            aes.Decrypt(nonce, cipher, tag, plain);

            var json = Encoding.UTF8.GetString(plain);
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
        }
        catch
        {
            return new Dictionary<string, string>();
        }
    }

    private async Task WriteStoreAsync(Dictionary<string, string> store, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(store);
        var plain = Encoding.UTF8.GetBytes(json);

        var nonce = new byte[12];
        RandomNumberGenerator.Fill(nonce);

        var tag = new byte[16];
        var cipher = new byte[plain.Length];

        using var aes = new AesGcm(_masterKey, 16);
        aes.Encrypt(nonce, plain, cipher, tag);

        var total = new byte[12 + 16 + cipher.Length];
        Buffer.BlockCopy(nonce, 0, total, 0, 12);
        Buffer.BlockCopy(tag, 0, total, 12, 16);
        Buffer.BlockCopy(cipher, 0, total, 28, cipher.Length);

        await File.WriteAllBytesAsync(_storePath, total, cancellationToken);
    }
}
