using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HimVote.Core.Services;

public class CrossPlatformSecureStore : ISecureStore
{
    private readonly string _storeFilePath;
    private readonly byte[] _encryptionKey;

    public CrossPlatformSecureStore(string? customStorePath = null)
    {
        var basePath = customStorePath;
        if (string.IsNullOrWhiteSpace(basePath))
        {
            var configDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            if (string.IsNullOrWhiteSpace(configDir))
            {
                configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config");
            }
            var dir = Path.Combine(configDir, "HimVote");
            Directory.CreateDirectory(dir);
            _storeFilePath = Path.Combine(dir, "secure_store.enc");
        }
        else
        {
            var parent = Path.GetDirectoryName(basePath);
            if (!string.IsNullOrEmpty(parent))
            {
                Directory.CreateDirectory(parent);
            }
            _storeFilePath = basePath;
        }

        // Derive persistent machine and user key
        var seedString = $"HimVote_{Environment.UserName}_{Environment.MachineName}";
        _encryptionKey = SHA256.HashData(Encoding.UTF8.GetBytes(seedString));
    }

    public async Task SetSecretAsync(string key, string secret, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var map = await ReadAllSecretsAsync(cancellationToken);
        map[key] = secret;
        await WriteAllSecretsAsync(map, cancellationToken);
    }

    public async Task<string?> GetSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var map = await ReadAllSecretsAsync(cancellationToken);
        return map.TryGetValue(key, out var val) ? val : null;
    }

    public async Task RemoveSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var map = await ReadAllSecretsAsync(cancellationToken);
        if (map.Remove(key))
        {
            await WriteAllSecretsAsync(map, cancellationToken);
        }
    }

    public async Task<bool> HasSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var map = await ReadAllSecretsAsync(cancellationToken);
        return map.ContainsKey(key);
    }

    private async Task<Dictionary<string, string>> ReadAllSecretsAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_storeFilePath))
        {
            return new Dictionary<string, string>();
        }

        try
        {
            var rawBytes = await File.ReadAllBytesAsync(_storeFilePath, cancellationToken);
            if (rawBytes.Length < 12 + 16)
            {
                return new Dictionary<string, string>();
            }

            var nonce = new byte[12];
            var tag = new byte[16];
            var cipherLen = rawBytes.Length - 12 - 16;
            var cipherBytes = new byte[cipherLen];

            Buffer.BlockCopy(rawBytes, 0, nonce, 0, 12);
            Buffer.BlockCopy(rawBytes, 12, tag, 0, 16);
            Buffer.BlockCopy(rawBytes, 28, cipherBytes, 0, cipherLen);

            var plainBytes = new byte[cipherLen];
            using var aesGcm = new AesGcm(_encryptionKey, 16);
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);

            var json = Encoding.UTF8.GetString(plainBytes);
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
        }
        catch
        {
            return new Dictionary<string, string>();
        }
    }

    private async Task WriteAllSecretsAsync(Dictionary<string, string> map, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(map);
        var plainBytes = Encoding.UTF8.GetBytes(json);

        var nonce = new byte[12];
        RandomNumberGenerator.Fill(nonce);

        var tag = new byte[16];
        var cipherBytes = new byte[plainBytes.Length];

        using var aesGcm = new AesGcm(_encryptionKey, 16);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var finalBytes = new byte[12 + 16 + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, finalBytes, 0, 12);
        Buffer.BlockCopy(tag, 0, finalBytes, 12, 16);
        Buffer.BlockCopy(cipherBytes, 0, finalBytes, 28, cipherBytes.Length);

        await File.WriteAllBytesAsync(_storeFilePath, finalBytes, cancellationToken);
    }
}
