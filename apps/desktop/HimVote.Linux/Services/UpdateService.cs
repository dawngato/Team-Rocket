using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class UpdateService : IUpdateService
{
    public Task<bool> CheckForUpdatesAsync()
    {
        // In production, check against a signed update manifest
        return Task.FromResult(false);
    }

    public Task DownloadUpdateAsync(string version)
    {
        // In production, download and verify update package
        return Task.CompletedTask;
    }
}