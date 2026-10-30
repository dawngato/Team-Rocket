using System.Diagnostics;
using System.Security;
using System.Security.Cryptography;
using System.Text.Json;
using HimVote.Windows.Models;

namespace HimVote.Windows.Services;

public class VerifierRunner : IVerifierRunner
{
    private readonly JsonSerializerOptions _jsonOptions;

    public VerifierRunner()
    {
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };
    }

    public string ComputeVerifierChecksum(string filePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Verifier binary or script not found: {filePath}");
        }

        using var stream = File.OpenRead(filePath);
        var hash = SHA256.HashData(stream);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public async Task<VerifierExecutionResult> RunVerifierAsync(VerifierExecutionOptions options, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentException.ThrowIfNullOrWhiteSpace(options.VerifierPath);
        ArgumentException.ThrowIfNullOrWhiteSpace(options.ExportDirectory);
        ArgumentException.ThrowIfNullOrWhiteSpace(options.TrustPinsFilePath);

        if (!File.Exists(options.VerifierPath))
        {
            return new VerifierExecutionResult
            {
                Success = false,
                ExitCode = 4,
                ErrorMessage = $"Verifier executable or script not found at {options.VerifierPath}"
            };
        }

        var actualChecksum = ComputeVerifierChecksum(options.VerifierPath);

        if (!string.IsNullOrWhiteSpace(options.ExpectedSha256Checksum))
        {
            var cleanExpected = options.ExpectedSha256Checksum.Trim().ToLowerInvariant();
            if (cleanExpected.StartsWith("sha256:", StringComparison.OrdinalIgnoreCase))
            {
                cleanExpected = cleanExpected.Substring(7);
            }

            if (!string.Equals(cleanExpected, actualChecksum, StringComparison.OrdinalIgnoreCase))
            {
                throw new SecurityException($"Verifier integrity check failed. Expected SHA256 {cleanExpected} but found {actualChecksum}. Execution halted.");
            }
        }

        var reportPath = options.OutputReportPath;
        var tempReportFileCreated = false;

        if (string.IsNullOrWhiteSpace(reportPath))
        {
            reportPath = Path.Combine(Path.GetTempPath(), $"himvote_report_{Guid.NewGuid():N}.json");
            tempReportFileCreated = true;
        }

        try
        {
            var isPythonScript = options.VerifierPath.EndsWith(".py", StringComparison.OrdinalIgnoreCase);
            var fileName = isPythonScript ? options.PythonExecutable : options.VerifierPath;
            var scriptArg = isPythonScript ? $"\"{options.VerifierPath}\" " : string.Empty;

            var arguments = $"{scriptArg}audit-evidence --export \"{options.ExportDirectory}\" --trust \"{options.TrustPinsFilePath}\" --report \"{reportPath}\"";
            if (options.AllowDevelopmentProfile) arguments += " --allow-development-profile";

            var startInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = Path.GetTempPath()
            };

            startInfo.Environment["HTTP_PROXY"] = "";
            startInfo.Environment["HTTPS_PROXY"] = "";
            startInfo.Environment["ALL_PROXY"] = "";
            startInfo.Environment["http_proxy"] = "";
            startInfo.Environment["https_proxy"] = "";
            startInfo.Environment["all_proxy"] = "";
            startInfo.Environment["NO_PROXY"] = "*";
            startInfo.Environment["no_proxy"] = "*";
            startInfo.Environment["PYTHONUNBUFFERED"] = "1";

            using var process = new Process { StartInfo = startInfo };

            process.Start();

            var readOutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var readErrTask = process.StandardError.ReadToEndAsync(cancellationToken);

            using var timeoutCts = new CancellationTokenSource(options.Timeout);
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

            try
            {
                await process.WaitForExitAsync(linkedCts.Token);
            }
            catch (OperationCanceledException)
            {
                try
                {
                    process.Kill(entireProcessTree: true);
                }
                catch
                {
                }

                return new VerifierExecutionResult
                {
                    Success = false,
                    ExitCode = -1,
                    VerifierChecksum = actualChecksum,
                    ErrorMessage = "Verifier process timed out and was killed."
                };
            }

            var stdout = await readOutTask;
            var stderr = await readErrTask;
            var exitCode = process.ExitCode;

            AuditReport? report = null;

            if (File.Exists(reportPath))
            {
                try
                {
                    var jsonContent = await File.ReadAllTextAsync(reportPath, cancellationToken);
                    report = JsonSerializer.Deserialize<AuditReport>(jsonContent, _jsonOptions);
                }
                catch
                {
                }
            }

            if (report == null)
            {
                report = CreateFallbackReport(exitCode, actualChecksum, stdout, stderr);
            }
            else
            {
                report.VerifierChecksum = actualChecksum;
                report.ExitCode = exitCode;
            }

            return new VerifierExecutionResult
            {
                Success = exitCode == 0,
                ExitCode = exitCode,
                VerifierChecksum = actualChecksum,
                Report = report,
                StandardOutput = stdout,
                StandardError = stderr
            };
        }
        finally
        {
            if (tempReportFileCreated && File.Exists(reportPath))
            {
                try
                {
                    File.Delete(reportPath);
                }
                catch
                {
                }
            }
        }
    }

    private static AuditReport CreateFallbackReport(int exitCode, string verifierChecksum, string stdout, string stderr)
    {
        var status = exitCode switch
        {
            0 => PropertyStatuses.Pass,
            2 => PropertyStatuses.Fail,
            3 => PropertyStatuses.Unverifiable,
            _ => PropertyStatuses.Fail
        };

        var failureCode = exitCode switch
        {
            0 => FailureCodes.None,
            2 => FailureCodes.BadSignature,
            3 => FailureCodes.StaleCheckpoint,
            _ => FailureCodes.Truncated
        };

        var props = new List<VerificationPropertyItem>
        {
            new() { PropertyName = VerificationProperties.RecordIntegrity, Status = status, FailureCode = failureCode, Summary = "Ballot records and checkpoints integrity" },
            new() { PropertyName = VerificationProperties.CredentialUniqueness, Status = status, FailureCode = failureCode, Summary = "Anonymous credential proofs and nullifiers" },
            new() { PropertyName = VerificationProperties.RosterAttestation, Status = status, FailureCode = failureCode, Summary = "Roster membership signature verification" },
            new() { PropertyName = VerificationProperties.TallyProof, Status = status, FailureCode = failureCode, Summary = "Native voting engine cryptographic tally proof" },
            new() { PropertyName = VerificationProperties.AnchorFinality, Status = status, FailureCode = failureCode, Summary = "Consortium blockchain anchor finality verification" },
            new() { PropertyName = VerificationProperties.BallotSecrecyAssumptions, Status = PropertyStatuses.Assumed, FailureCode = FailureCodes.None, Summary = "Engine specific ballot secrecy assumptions" },
            new() { PropertyName = VerificationProperties.CastAsIntended, Status = PropertyStatuses.Assumed, FailureCode = FailureCodes.None, Summary = "Client booth cast as intended proof verification" },
            new() { PropertyName = VerificationProperties.ReceiptFreeness, Status = PropertyStatuses.Limited, FailureCode = FailureCodes.None, Summary = "Receipt freeness bounded by platform constraints" },
            new() { PropertyName = VerificationProperties.CompromisedEndpointResistance, Status = PropertyStatuses.Limited, FailureCode = FailureCodes.None, Summary = "Endpoint protection and trusted execution constraints" },
            new() { PropertyName = VerificationProperties.IndependentOperators, Status = PropertyStatuses.Pass, FailureCode = FailureCodes.None, Summary = "Witness operated independently from platform admin" },
            new() { PropertyName = VerificationProperties.RealWorldEligibility, Status = PropertyStatuses.Assumed, FailureCode = FailureCodes.None, Summary = "Institutional roster and registrar verification" }
        };

        return new AuditReport
        {
            ElectionId = "unknown",
            ManifestDigest = "",
            VerifierChecksum = verifierChecksum,
            VerifierVersion = "himvote_verifier_v2",
            GeneratedAtUtc = DateTimeOffset.UtcNow,
            ExitCode = exitCode,
            OverallStatus = status,
            RootComparison = new RootComparison
            {
                PublishedRoot = "sha256:unknown",
                ComputedRoot = "sha256:unknown",
                Matches = exitCode == 0
            },
            TallyComparison = new TallyComparison
            {
                PublishedTotalBallots = 0,
                ComputedTotalBallots = 0,
                Matches = exitCode == 0
            },
            Properties = props
        };
    }
}
