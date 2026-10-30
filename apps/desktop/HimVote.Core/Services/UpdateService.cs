using System.Security.Cryptography;

namespace HimVote.Core.Services;

public class UpdateService : IUpdateService
{
    public string AppVersion => "2.0.0";
    public string VerifierVersion => "2.0.0";
    public string DistributionChannel => "MSIX_Enterprise_Channel";

    public Task<UpdateInfo> CheckForUpdatesAsync(CancellationToken cancellationToken = default)
    {
        var info = new UpdateInfo
        {
            IsUpdateAvailable = false,
            CurrentVersion = AppVersion,
            LatestVersion = AppVersion,
            ReleaseNotesUrl = "https://himvote.hptu.edu/releases/v2.0.0",
            Channel = DistributionChannel,
            LastCheckedUtc = DateTimeOffset.UtcNow
        };

        return Task.FromResult(info);
    }

    public Task<string> GetVerifierChecksumAsync(string verifierPath, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(verifierPath))
        {
            return Task.FromResult(string.Empty);
        }

        using var stream = File.OpenRead(verifierPath);
        var hash = SHA256.HashData(stream);
        return Task.FromResult(Convert.ToHexString(hash).ToLowerInvariant());
    }
}
