namespace HimVote.Core.Services;

public sealed class ExtractionResult
{
    public bool Success { get; set; }
    public string DestinationDirectory { get; set; } = string.Empty;
    public int FileCount { get; set; }
    public long TotalBytesExtracted { get; set; }
    public string? ErrorMessage { get; set; }
    public IReadOnlyList<string> ExtractedFiles { get; set; } = Array.Empty<string>();
}

public interface IEvidenceImporter
{
    long MaxEntrySizeBytes { get; set; }
    long MaxTotalSizeBytes { get; set; }
    int MaxFileCount { get; set; }

    Task<ExtractionResult> ExtractArchiveAsync(string zipFilePath, string destinationDirectory, CancellationToken cancellationToken = default);
    Task<ExtractionResult> ExtractArchiveAsync(Stream zipStream, string destinationDirectory, CancellationToken cancellationToken = default);
}
