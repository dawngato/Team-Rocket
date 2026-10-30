using System.Reflection;
using System.Security.Cryptography;

namespace HimVote.Windows.Services;

public class UpdateService : IUpdateService
{
    private const string CurrentAppVersion = "2.0.0";
    private const string CurrentVerifierVersion = "2.0.0";
    private const string DefaultChannel = "Enterprise MSIX Signed Channel";

    public string AppVersion => Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? CurrentAppVersion;
    public string VerifierVersion => CurrentVerifierVersion;
    public string DistributionChannel => DefaultChannel;

    public Task<UpdateInfo> CheckForUpdatesAsync(CancellationToken cancellationToken = default)
    {
        var info = new UpdateInfo
        {
            IsUpdateAvailable = false,
            CurrentVersion = AppVersion,
            LatestVersion = AppVersion,
            ReleaseNotesUrl = "https://himvote.example.in/releases",
            Channel = DistributionChannel,
            LastCheckedUtc = DateTimeOffset.UtcNow
        };

        return Task.FromResult(info);
    }

    public async Task<string> GetVerifierChecksumAsync(string verifierPath, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(verifierPath))
        {
            return "UNAVAILABLE";
        }

        await using var stream = File.OpenRead(verifierPath);
        var hash = await SHA256.HashDataAsync(stream, cancellationToken);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
