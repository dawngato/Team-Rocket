using System.IO.Compression;
using System.Security;

namespace HimVote.Windows.Services;

public class EvidenceImporter : IEvidenceImporter
{
    private const int DefaultMaxFileCount = 10000;
    private const long DefaultMaxEntrySize = 500 * 1024 * 1024;
    private const long DefaultMaxTotalSize = 2L * 1024 * 1024 * 1024;

    private const int UnixSymlinkMode = 0xA000;
    private const int WindowsReparsePointAttribute = 0x400;

    public long MaxEntrySizeBytes { get; set; } = DefaultMaxEntrySize;
    public long MaxTotalSizeBytes { get; set; } = DefaultMaxTotalSize;
    public int MaxFileCount { get; set; } = DefaultMaxFileCount;

    public async Task<ExtractionResult> ExtractArchiveAsync(string zipFilePath, string destinationDirectory, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(zipFilePath))
        {
            return new ExtractionResult
            {
                Success = false,
                ErrorMessage = $"Archive file not found: {zipFilePath}"
            };
        }

        await using var stream = File.OpenRead(zipFilePath);
        return await ExtractArchiveAsync(stream, destinationDirectory, cancellationToken);
    }

    public async Task<ExtractionResult> ExtractArchiveAsync(Stream zipStream, string destinationDirectory, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(zipStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationDirectory);

        var fullDestination = Path.GetFullPath(destinationDirectory);
        var extractedFiles = new List<string>();
        var normalizedEntryNames = new HashSet<string>(
            OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
        long totalBytesExtracted = 0;
        int fileCount = 0;

        try
        {
            Directory.CreateDirectory(fullDestination);

            using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: true);

            if (archive.Entries.Count > MaxFileCount)
            {
                throw new SecurityException($"Archive file count {archive.Entries.Count} exceeds maximum limit of {MaxFileCount}.");
            }

            // Validate the complete entry set before writing anything. ZipArchive permits
            // duplicate names, and extracting them in sequence would silently overwrite
            // evidence while reporting only the final bytes to the verifier.
            foreach (var entry in archive.Entries)
            {
                ValidateEntrySafety(entry);
                var normalizedName = NormalizeEntryName(entry.FullName);
                if (!normalizedEntryNames.Add(normalizedName))
                {
                    throw new SecurityException($"Duplicate archive entry path rejected: {entry.FullName}");
                }
            }

            foreach (var entry in archive.Entries)
            {
                cancellationToken.ThrowIfCancellationRequested();

                ValidateEntrySafety(entry);

                var entryDestination = Path.GetFullPath(Path.Combine(fullDestination, entry.FullName));

                var pathComparison = OperatingSystem.IsWindows()
                    ? StringComparison.OrdinalIgnoreCase
                    : StringComparison.Ordinal;

                if (!entryDestination.StartsWith(fullDestination + Path.DirectorySeparatorChar, pathComparison) &&
                    !string.Equals(entryDestination, fullDestination, pathComparison))
                {
                    throw new SecurityException($"Path traversal detected for entry: {entry.FullName}");
                }

                if (string.IsNullOrEmpty(entry.Name))
                {
                    Directory.CreateDirectory(entryDestination);
                    continue;
                }

                fileCount++;
                if (fileCount > MaxFileCount)
                {
                    throw new SecurityException($"Extraction aborted because file count exceeded limit of {MaxFileCount}.");
                }

                if (entry.Length > MaxEntrySizeBytes)
                {
                    throw new SecurityException($"Entry {entry.FullName} size {entry.Length} exceeds maximum limit of {MaxEntrySizeBytes} bytes.");
                }

                var parentDir = Path.GetDirectoryName(entryDestination);
                if (!string.IsNullOrEmpty(parentDir))
                {
                    Directory.CreateDirectory(parentDir);
                }

                // Register the destination before opening it so a cancellation, size
                // limit, or decompression error also removes a partially written file.
                extractedFiles.Add(entryDestination);

                await using (var entryStream = entry.Open())
                await using (var targetStream = File.Create(entryDestination))
                {
                    var buffer = new byte[81920];
                    int bytesRead;
                    long entryBytesRead = 0;

                    while ((bytesRead = await entryStream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
                    {
                        entryBytesRead += bytesRead;
                        totalBytesExtracted += bytesRead;

                        if (entryBytesRead > MaxEntrySizeBytes)
                        {
                            throw new SecurityException($"Entry {entry.FullName} uncompressed stream exceeded limit of {MaxEntrySizeBytes} bytes.");
                        }

                        if (totalBytesExtracted > MaxTotalSizeBytes)
                        {
                            throw new SecurityException($"Total uncompressed bytes exceeded limit of {MaxTotalSizeBytes} bytes.");
                        }

                        await targetStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
                    }
                }

            }

            return new ExtractionResult
            {
                Success = true,
                DestinationDirectory = fullDestination,
                FileCount = fileCount,
                TotalBytesExtracted = totalBytesExtracted,
                ExtractedFiles = extractedFiles
            };
        }
        catch (Exception ex)
        {
            CleanUpExtractedFiles(extractedFiles);
            return new ExtractionResult
            {
                Success = false,
                DestinationDirectory = fullDestination,
                ErrorMessage = ex.Message
            };
        }
    }

    private static void ValidateEntrySafety(ZipArchiveEntry entry)
    {
        var name = entry.FullName;
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new SecurityException("Archive contains an entry with an empty or whitespace name.");
        }

        if (name.Contains('\0'))
        {
            throw new SecurityException("Archive entry name contains null characters.");
        }

        var normalized = name.Replace('\\', '/');
        var parts = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);

        foreach (var part in parts)
        {
            if (part == "..")
            {
                throw new SecurityException($"Path traversal component detected in archive entry: {entry.FullName}");
            }
        }

        if (normalized.StartsWith('/') || (normalized.Length > 1 && normalized[1] == ':'))
        {
            throw new SecurityException($"Absolute path rejected in archive entry: {entry.FullName}");
        }

        if (parts.Any(p => p.Contains(':')))
        {
            throw new SecurityException($"Alternate stream or invalid character detected in archive entry: {entry.FullName}");
        }

        var unixMode = (entry.ExternalAttributes >> 16) & 0xF000;
        if (unixMode == UnixSymlinkMode)
        {
            throw new SecurityException($"Symbolic link rejected in archive entry: {entry.FullName}");
        }

        var windowsAttrs = entry.ExternalAttributes & 0xFFFF;
        if ((windowsAttrs & WindowsReparsePointAttribute) != 0)
        {
            throw new SecurityException($"Reparse point rejected in archive entry: {entry.FullName}");
        }
    }

    private static string NormalizeEntryName(string name)
    {
        var normalized = name.Replace('\\', '/').TrimEnd('/');
        return normalized;
    }

    private static void CleanUpExtractedFiles(IEnumerable<string> files)
    {
        foreach (var file in files)
        {
            try
            {
                if (File.Exists(file))
                {
                    File.Delete(file);
                }
            }
            catch
            {
            }
        }
    }
}
