using System.IO.Compression;
using System.Text;
using HimVote.Core.Services;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class CoreEvidenceImporterTests : IDisposable
{
    private readonly string _testRoot;

    public CoreEvidenceImporterTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"himvote_core_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testRoot);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testRoot))
            {
                Directory.Delete(_testRoot, recursive: true);
            }
        }
        catch
        {
        }
    }

    [Fact]
    public async Task ExtractArchiveAsync_ValidArchive_ExtractsFilesCorrectly()
    {
        var zipPath = Path.Combine(_testRoot, "valid.zip");
        var destDir = Path.Combine(_testRoot, "output");

        using (var zipStream = new FileStream(zipPath, FileMode.Create))
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create))
        {
            var manifestEntry = archive.CreateEntry("manifest.json");
            using (var writer = new StreamWriter(manifestEntry.Open()))
            {
                writer.Write("{\"election_id\":\"elec_test\"}");
            }

            var leavesEntry = archive.CreateEntry("leaves/leaf_0.json");
            using (var writer = new StreamWriter(leavesEntry.Open()))
            {
                writer.Write("{\"leaf_index\":0}");
            }
        }

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(zipPath, destDir);

        Assert.True(result.Success);
        Assert.Equal(2, result.FileCount);
        Assert.True(result.TotalBytesExtracted > 0);
        Assert.True(File.Exists(Path.Combine(destDir, "manifest.json")));
        Assert.True(File.Exists(Path.Combine(destDir, "leaves", "leaf_0.json")));
    }

    [Fact]
    public async Task ExtractArchiveAsync_NonExistentFile_ReturnsFailure()
    {
        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync("/path/to/missing_file.zip", _testRoot);

        Assert.False(result.Success);
        Assert.Contains("Archive file not found", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_PathTraversal_RejectsAndCleansUp()
    {
        var zipPath = Path.Combine(_testRoot, "traversal.zip");
        var destDir = Path.Combine(_testRoot, "traversal_dest");

        using (var zipStream = new FileStream(zipPath, FileMode.Create))
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create))
        {
            var badEntry = archive.CreateEntry("../escaped.txt");
            using (var writer = new StreamWriter(badEntry.Open()))
            {
                writer.Write("malicious content");
            }
        }

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(zipPath, destDir);

        Assert.False(result.Success);
        Assert.Contains("Path traversal component detected", result.ErrorMessage);
        Assert.False(File.Exists(Path.Combine(_testRoot, "escaped.txt")));
    }

    [Fact]
    public async Task ExtractArchiveAsync_ExceedsMaxFileCount_Rejects()
    {
        var zipPath = Path.Combine(_testRoot, "many_files.zip");
        var destDir = Path.Combine(_testRoot, "bomb_dest");

        using (var zipStream = new FileStream(zipPath, FileMode.Create))
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create))
        {
            for (int i = 0; i < 5; i++)
            {
                var entry = archive.CreateEntry($"entry_{i}.txt");
                using var writer = new StreamWriter(entry.Open());
                writer.Write($"content_{i}");
            }
        }

        var importer = new EvidenceImporter
        {
            MaxFileCount = 3
        };

        var result = await importer.ExtractArchiveAsync(zipPath, destDir);

        Assert.False(result.Success);
        Assert.Contains("exceeds maximum limit", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_DuplicateEntryNames_RejectsBeforeWriting()
    {
        var zipPath = Path.Combine(_testRoot, "duplicate.zip");
        var destDir = Path.Combine(_testRoot, "duplicate_dest");

        using (var zipStream = new FileStream(zipPath, FileMode.Create))
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create))
        {
            foreach (var content in new[] { "first", "second" })
            {
                var entry = archive.CreateEntry("manifest.json");
                await using var writer = new StreamWriter(entry.Open());
                await writer.WriteAsync(content);
            }
        }

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(zipPath, destDir);

        Assert.False(result.Success);
        Assert.Contains("Duplicate archive entry path rejected", result.ErrorMessage);
        Assert.False(File.Exists(Path.Combine(destDir, "manifest.json")));
    }

    [Fact]
    public async Task ExtractArchiveAsync_TotalBytesLimitExceeded_RemovesPartialFiles()
    {
        var zipPath = Path.Combine(_testRoot, "partial_cleanup.zip");
        var destDir = Path.Combine(_testRoot, "partial_cleanup_dest");

        using (var zipStream = new FileStream(zipPath, FileMode.Create))
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create))
        {
            for (var i = 0; i < 2; i++)
            {
                var entry = archive.CreateEntry($"entry_{i}.bin");
                await using var entryStream = entry.Open();
                await entryStream.WriteAsync(new byte[800]);
            }
        }

        var importer = new EvidenceImporter
        {
            MaxEntrySizeBytes = 10_000,
            MaxTotalSizeBytes = 1_000
        };

        var result = await importer.ExtractArchiveAsync(zipPath, destDir);

        Assert.False(result.Success);
        Assert.Contains("exceeded limit", result.ErrorMessage);
        Assert.Empty(Directory.EnumerateFiles(destDir, "*", SearchOption.AllDirectories));
    }
}
