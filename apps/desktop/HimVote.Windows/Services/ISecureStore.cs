namespace HimVote.Windows.Services;

public interface ISecureStore
{
    Task SetSecretAsync(string key, string secret, CancellationToken cancellationToken = default);
    Task<string?> GetSecretAsync(string key, CancellationToken cancellationToken = default);
    Task RemoveSecretAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> HasSecretAsync(string key, CancellationToken cancellationToken = default);
}
