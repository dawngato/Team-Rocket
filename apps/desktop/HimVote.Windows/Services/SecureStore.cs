using System.Security.Cryptography;
using System.Text;

namespace HimVote.Windows.Services;

public class SecureStore : ISecureStore
{
    private readonly string _storageDirectory;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("HimVote.Desktop.Entropy.v1");

    public SecureStore(string? baseDirectory = null)
    {
        if (string.IsNullOrWhiteSpace(baseDirectory))
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _storageDirectory = Path.Combine(appData, "HimVote", "SecureStore");
        }
        else
        {
            _storageDirectory = baseDirectory;
        }

        Directory.CreateDirectory(_storageDirectory);
    }

    private string GetFilePath(string key)
    {
        var sanitizedKey = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
        return Path.Combine(_storageDirectory, sanitizedKey + ".dat");
    }

    public Task SetSecretAsync(string key, string secret, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        ArgumentNullException.ThrowIfNull(secret);

        var filePath = GetFilePath(key);
        var plainBytes = Encoding.UTF8.GetBytes(secret);

        byte[] encryptedBytes;
        if (OperatingSystem.IsWindows())
        {
            encryptedBytes = ProtectedData.Protect(plainBytes, Entropy, DataProtectionScope.CurrentUser);
        }
        else
        {
            encryptedBytes = FallbackEncrypt(plainBytes);
        }

        File.WriteAllBytes(filePath, encryptedBytes);
        return Task.CompletedTask;
    }

    public Task<string?> GetSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        var filePath = GetFilePath(key);
        if (!File.Exists(filePath))
        {
            return Task.FromResult<string?>(null);
        }

        try
        {
            var encryptedBytes = File.ReadAllBytes(filePath);
            byte[] plainBytes;

            if (OperatingSystem.IsWindows())
            {
                plainBytes = ProtectedData.Unprotect(encryptedBytes, Entropy, DataProtectionScope.CurrentUser);
            }
            else
            {
                plainBytes = FallbackDecrypt(encryptedBytes);
            }

            var secret = Encoding.UTF8.GetString(plainBytes);
            return Task.FromResult<string?>(secret);
        }
        catch
        {
            return Task.FromResult<string?>(null);
        }
    }

    public Task RemoveSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        var filePath = GetFilePath(key);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        return Task.CompletedTask;
    }

    public Task<bool> HasSecretAsync(string key, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var filePath = GetFilePath(key);
        return Task.FromResult(File.Exists(filePath));
    }

    private static byte[] FallbackEncrypt(byte[] plainBytes)
    {
        using var aes = Aes.Create();
        var key = SHA256.HashData(Entropy);
        aes.Key = key;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var cipher = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var result = new byte[aes.IV.Length + cipher.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipher, 0, result, aes.IV.Length, cipher.Length);
        return result;
    }

    private static byte[] FallbackDecrypt(byte[] encryptedBytes)
    {
        using var aes = Aes.Create();
        var key = SHA256.HashData(Entropy);
        aes.Key = key;

        var iv = new byte[16];
        Buffer.BlockCopy(encryptedBytes, 0, iv, 0, 16);
        aes.IV = iv;

        var cipherLen = encryptedBytes.Length - 16;
        var cipher = new byte[cipherLen];
        Buffer.BlockCopy(encryptedBytes, 16, cipher, 0, cipherLen);

        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
    }
}
