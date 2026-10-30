namespace HimVote.Core.Services;

public sealed class UpdateInfo
{
    public bool IsUpdateAvailable { get; set; }
    public string CurrentVersion { get; set; } = string.Empty;
    public string LatestVersion { get; set; } = string.Empty;
    public string ReleaseNotesUrl { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public DateTimeOffset LastCheckedUtc { get; set; }
}

public interface IUpdateService
{
    string AppVersion { get; }
    string VerifierVersion { get; }
    string DistributionChannel { get; }

    Task<UpdateInfo> CheckForUpdatesAsync(CancellationToken cancellationToken = default);
    Task<string> GetVerifierChecksumAsync(string verifierPath, CancellationToken cancellationToken = default);

    Task<bool> HasUpdateAsync() => CheckForUpdatesAsync(CancellationToken.None).ContinueWith(t => t.Result.IsUpdateAvailable);
    Task DownloadUpdateAsync(string version) => Task.CompletedTask;
}
