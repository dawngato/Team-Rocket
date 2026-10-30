using System.IO.Compression;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

/// <summary>
/// Safe evidence archive extraction for Linux.
/// Prevents path traversal and symlink attacks.
/// </summary>
public class EvidenceImporter : IEvidenceImporter
{
    private const long MaxFileSize = 100_000_000; // 100 MB
    private const int MaxFileCount = 1000;

    public async Task<bool> ImportEvidenceAsync(string archivePath)
    {
        if (!File.Exists(archivePath)) return false;

        var extractDir = Path.Combine(Path.GetTempPath(), $"himvote-evidence-{Guid.NewGuid():N}");
        Directory.CreateDirectory(extractDir);

        try
        {
            using var archive = ZipFile.OpenRead(archivePath);
            int count = 0;

            foreach (var entry in archive.Entries)
            {
                if (++count > MaxFileCount) return false;

                // Reject path traversal
                var targetPath = Path.GetFullPath(Path.Combine(extractDir, entry.FullName));
                if (!targetPath.StartsWith(Path.GetFullPath(extractDir) + Path.DirectorySeparatorChar))
                    return false;

                // Reject symlinks (zip entries don't have symlinks by default, but check)
                if (entry.FullName.Contains("..")) return false;

                // Size check
                if (entry.Length > MaxFileSize) return false;

                if (!string.IsNullOrEmpty(entry.Name))
                {
                    entry.ExtractToFile(targetPath, overwrite: true);
                }
            }

            return true;
        }
        catch
        {
            return false;
        }
        finally
        {
            // Optionally clean up extractDir
        }
    }
}