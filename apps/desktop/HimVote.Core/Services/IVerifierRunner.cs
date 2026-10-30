using HimVote.Core.Models;

namespace HimVote.Core.Services;

public sealed class VerifierExecutionOptions
{
    public string VerifierPath { get; set; } = string.Empty;
    public string? ExpectedSha256Checksum { get; set; }
    public string ExportDirectory { get; set; } = string.Empty;
    public string TrustPinsFilePath { get; set; } = string.Empty;
    public string? OutputReportPath { get; set; }
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(60);
    public string PythonExecutable { get; set; } = "python3";
}

public sealed class VerifierExecutionResult
{
    public bool Success { get; set; }
    public int ExitCode { get; set; }
    public string VerifierChecksum { get; set; } = string.Empty;
    public AuditReport? Report { get; set; }
    public string StandardOutput { get; set; } = string.Empty;
    public string StandardError { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

public interface IVerifierRunner
{
    string ComputeVerifierChecksum(string filePath);
    Task<VerifierExecutionResult> RunVerifierAsync(VerifierExecutionOptions options, CancellationToken cancellationToken = default);
}
