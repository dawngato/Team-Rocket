using HimVote.Windows.Models;

namespace HimVote.Windows.Services;

public interface ITrustPinStore
{
    TrustPins? CurrentPins { get; }
    Task<TrustPins> ImportFromFileAsync(string externalFilePath, string? forbiddenArchiveDirectory = null, CancellationToken cancellationToken = default);
    Task SavePinsAsync(TrustPins pins, CancellationToken cancellationToken = default);
    Task<TrustPins?> LoadSavedPinsAsync(CancellationToken cancellationToken = default);
    void Clear();
}
