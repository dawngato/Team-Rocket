using System.IO.Compression;
using System.Security;
using System.Text;
using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class EvidenceImporterTests : IDisposable
{
    private readonly string _testRoot;

    public EvidenceImporterTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), "himvote_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testRoot))
        {
            try
            {
                Directory.Delete(_testRoot, true);
            }
            catch
            {
            }
        }
    }

    [Fact]
    public async Task ExtractArchiveAsync_ValidZip_ExtractsSuccessfully()
    {
        var zipPath = Path.Combine(_testRoot, "valid.zip");
        var destDir = Path.Combine(_testRoot, "extracted_valid");

        using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
        {
            var entry = zip.CreateEntry("manifest.json");
            using var writer = new StreamWriter(entry.Open());
            writer.Write("{\"title\":\"Institutional Election 2026\"}");
        }

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(zipPath, destDir);

        Assert.True(result.Success);
        Assert.Equal(1, result.FileCount);
        Assert.True(File.Exists(Path.Combine(destDir, "manifest.json")));
    }

    [Fact]
    public async Task ExtractArchiveAsync_PathTraversal_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_traversal");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var entry = zip.CreateEntry("../evil.txt");
            using var writer = new StreamWriter(entry.Open());
            writer.Write("attack");
        }
        stream.Position = 0;

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("Path traversal", result.ErrorMessage);
        Assert.False(File.Exists(Path.Combine(_testRoot, "evil.txt")));
    }

    [Fact]
    public async Task ExtractArchiveAsync_AbsoluteUnixPath_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_absolute");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var entry = zip.CreateEntry("/etc/passwd");
            using var writer = new StreamWriter(entry.Open());
            writer.Write("attack");
        }
        stream.Position = 0;

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("Absolute path rejected", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_AlternateDataStream_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_ads");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var entry = zip.CreateEntry("manifest.json:Zone.Identifier");
            using var writer = new StreamWriter(entry.Open());
            writer.Write("attack");
        }
        stream.Position = 0;

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("Alternate stream", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_SymlinkEntry_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_symlink");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var entry = zip.CreateEntry("link_to_passwd");
            entry.ExternalAttributes = 0xA1ED << 16;
            using var writer = new StreamWriter(entry.Open());
            writer.Write("/etc/passwd");
        }
        stream.Position = 0;

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("Symbolic link rejected", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_ExceedsMaxFileCount_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_files_limit");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            for (var i = 0; i < 6; i++)
            {
                var entry = zip.CreateEntry($"file_{i}.txt");
                using var writer = new StreamWriter(entry.Open());
                writer.Write("test");
            }
        }
        stream.Position = 0;

        var importer = new EvidenceImporter
        {
            MaxFileCount = 4
        };

        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("exceeds maximum limit", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_ExceedsSingleFileLimit_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_size_limit");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var entry = zip.CreateEntry("oversized.bin");
            using var entryStream = entry.Open();
            var payload = new byte[20000];
            entryStream.Write(payload);
        }
        stream.Position = 0;

        var importer = new EvidenceImporter
        {
            MaxEntrySizeBytes = 1000
        };

        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("exceeds maximum limit", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_BackslashTraversal_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_win_traversal");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var entry = zip.CreateEntry("..\\..\\back_traversal.txt");
            using var writer = new StreamWriter(entry.Open());
            writer.Write("attack");
        }
        stream.Position = 0;

        var importer = new EvidenceImporter();
        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("Path traversal", result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractArchiveAsync_TotalBytesLimitExceeded_RejectsAndFails()
    {
        var destDir = Path.Combine(_testRoot, "extracted_total_limit");
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            for (var i = 0; i < 3; i++)
            {
                var entry = zip.CreateEntry($"entry_{i}.bin");
                using var entryStream = entry.Open();
                var chunk = new byte[800];
                entryStream.Write(chunk);
            }
        }
        stream.Position = 0;

        var importer = new EvidenceImporter
        {
            MaxEntrySizeBytes = 10000,
            MaxTotalSizeBytes = 1500
        };

        var result = await importer.ExtractArchiveAsync(stream, destDir);

        Assert.False(result.Success);
        Assert.Contains("exceeded limit", result.ErrorMessage);
    }
}
