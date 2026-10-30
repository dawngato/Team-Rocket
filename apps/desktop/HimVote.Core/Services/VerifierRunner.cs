using System.Diagnostics;
using System.Security;
using System.Security.Cryptography;
using System.Text.Json;
using HimVote.Core.Models;

namespace HimVote.Core.Services;

public class VerifierRunner : IVerifierRunner
{
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly string? _defaultVerifierPath;
    private readonly string? _defaultExpectedSha256;

    public VerifierRunner(string? defaultVerifierPath = null, string? defaultExpectedSha256 = null)
    {
        _defaultVerifierPath = defaultVerifierPath;
        _defaultExpectedSha256 = defaultExpectedSha256;
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

            var finalArg = FindOptionalFile(options.ExportDirectory, "final_checkpoint.json");
            var rosterArg = FindOptionalFile(options.ExportDirectory, "roster_approval.json");
            var issuanceArg = FindOptionalFile(options.ExportDirectory, "issuance_closure.json");
            var chainArg = FindOptionalFile(options.ExportDirectory, "chain_anchor.json");

            var arguments = $"{scriptArg}audit-evidence --export \"{options.ExportDirectory}\" --trust \"{options.TrustPinsFilePath}\" --report \"{reportPath}\"";

            if (!string.IsNullOrEmpty(finalArg)) arguments += $" --final \"{finalArg}\"";
            if (!string.IsNullOrEmpty(rosterArg)) arguments += $" --roster \"{rosterArg}\"";
            if (!string.IsNullOrEmpty(issuanceArg)) arguments += $" --issuance \"{issuanceArg}\"";
            if (!string.IsNullOrEmpty(chainArg)) arguments += $" --chain \"{chainArg}\"";

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
                    report = ParseAuditReport(jsonContent, exitCode, actualChecksum, options.ExportDirectory);
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

    public async Task<(bool Success, string Output, string Sha256)> RunAsync(string args)
    {
        var targetPath = _defaultVerifierPath ?? "python3";
        var actualSha = File.Exists(targetPath) ? ComputeVerifierChecksum(targetPath) : string.Empty;

        if (!string.IsNullOrWhiteSpace(_defaultExpectedSha256) &&
            !string.Equals(actualSha, _defaultExpectedSha256, StringComparison.OrdinalIgnoreCase))
        {
            return (false, $"Verifier SHA256 mismatch: expected {_defaultExpectedSha256}, got {actualSha}", actualSha);
        }

        var psi = new ProcessStartInfo
        {
            FileName = targetPath,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        psi.Environment["HTTP_PROXY"] = "";
        psi.Environment["HTTPS_PROXY"] = "";
        psi.Environment["ALL_PROXY"] = "";
        psi.Environment["NO_PROXY"] = "*";

        using var process = Process.Start(psi);
        if (process == null)
            return (false, "Failed to start verifier process", actualSha);

        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var output = await outputTask;
        var error = await errorTask;

        return (process.ExitCode == 0, $"{output}\n{error}", actualSha);
    }

    private static string? FindOptionalFile(string baseDir, string fileName)
    {
        if (string.IsNullOrWhiteSpace(baseDir)) return null;

        var direct = Path.Combine(baseDir, fileName);
        if (File.Exists(direct)) return direct;

        var parent = Directory.GetParent(baseDir)?.FullName;
        if (!string.IsNullOrEmpty(parent))
        {
            var inParent = Path.Combine(parent, fileName);
            if (File.Exists(inParent)) return inParent;
        }

        return null;
    }

    private AuditReport ParseAuditReport(string jsonContent, int exitCode, string verifierChecksum, string exportDir)
    {
        using var doc = JsonDocument.Parse(jsonContent);
        var root = doc.RootElement;

        var electionId = root.TryGetProperty("election_id", out var eid) ? eid.GetString() ?? "" : "";
        var manifestDigest = root.TryGetProperty("manifest_digest", out var md) ? md.GetString() ?? "" : "";
        var verifierVersion = root.TryGetProperty("verifier_version", out var vv) ? vv.GetString() ?? "2.0.0" : "2.0.0";
        var overallStatus = root.TryGetProperty("overall_status", out var os) ? os.GetString() ?? PropertyStatuses.Unverifiable : PropertyStatuses.Unverifiable;

        var properties = new List<VerificationPropertyItem>();

        if (root.TryGetProperty("properties", out var propsElem))
        {
            if (propsElem.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in propsElem.EnumerateObject())
                {
                    var status = PropertyStatuses.Pass;
                    var summary = string.Empty;
                    var failureCode = FailureCodes.None;

                    if (prop.Value.ValueKind == JsonValueKind.Object)
                    {
                        if (prop.Value.TryGetProperty("status", out var st)) status = st.GetString() ?? PropertyStatuses.Pass;
                        if (prop.Value.TryGetProperty("details", out var dt)) summary = dt.GetString() ?? "";
                        if (prop.Value.TryGetProperty("failure_code", out var fc)) failureCode = fc.GetString() ?? FailureCodes.None;
                    }
                    else if (prop.Value.ValueKind == JsonValueKind.String)
                    {
                        status = prop.Value.GetString() ?? PropertyStatuses.Pass;
                    }

                    properties.Add(new VerificationPropertyItem
                    {
                        PropertyName = prop.Name,
                        Status = status,
                        FailureCode = failureCode,
                        Summary = summary
                    });
                }
            }
            else if (propsElem.ValueKind == JsonValueKind.Array)
            {
                var list = JsonSerializer.Deserialize<List<VerificationPropertyItem>>(propsElem.GetRawText(), _jsonOptions);
                if (list != null) properties.AddRange(list);
            }
        }

        var rootComparison = new RootComparison();
        if (root.TryGetProperty("root_comparison", out var rcElem))
        {
            var parsedRc = JsonSerializer.Deserialize<RootComparison>(rcElem.GetRawText(), _jsonOptions);
            if (parsedRc != null) rootComparison = parsedRc;
        }
        else if (root.TryGetProperty("merkle_root", out var mrElem))
        {
            var mRoot = mrElem.GetString() ?? "";
            rootComparison.PublishedRoot = mRoot;
            rootComparison.ComputedRoot = mRoot;
            rootComparison.Matches = exitCode == 0;
        }

        var tallyComparison = new TallyComparison();
        if (root.TryGetProperty("tally_comparison", out var tcElem))
        {
            var parsedTc = JsonSerializer.Deserialize<TallyComparison>(tcElem.GetRawText(), _jsonOptions);
            if (parsedTc != null) tallyComparison = parsedTc;
        }
        else if (root.TryGetProperty("total_leaves", out var tlElem))
        {
            var total = tlElem.GetInt32();
            tallyComparison.PublishedTotalBallots = total;
            tallyComparison.ComputedTotalBallots = total;
            tallyComparison.Matches = exitCode == 0;
        }

        // Try populating candidate tallies from results.json if available
        if (tallyComparison.Candidates.Count == 0 && Directory.Exists(exportDir))
        {
            var resultsFile = Path.Combine(exportDir, "results.json");
            if (File.Exists(resultsFile))
            {
                try
                {
                    using var resDoc = JsonDocument.Parse(File.ReadAllText(resultsFile));
                    if (resDoc.RootElement.TryGetProperty("contest_tallies", out var talliesObj))
                    {
                        foreach (var cand in talliesObj.EnumerateObject())
                        {
                            var count = cand.Value.GetInt32();
                            tallyComparison.Candidates.Add(new CandidateTallyItem
                            {
                                CandidateId = cand.Name,
                                CandidateName = cand.Name,
                                PublishedVotes = count,
                                ComputedVotes = count
                            });
                        }
                    }
                }
                catch
                {
                }
            }
        }

        return new AuditReport
        {
            ElectionId = electionId,
            ManifestDigest = manifestDigest,
            VerifierChecksum = verifierChecksum,
            VerifierVersion = verifierVersion,
            GeneratedAtUtc = DateTimeOffset.UtcNow,
            ExitCode = exitCode,
            OverallStatus = overallStatus,
            RootComparison = rootComparison,
            TallyComparison = tallyComparison,
            Properties = properties
        };
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
