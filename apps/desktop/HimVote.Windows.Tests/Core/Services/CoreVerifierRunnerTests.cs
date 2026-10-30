using System.Security;
using System.Security.Cryptography;
using System.Text.Json;
using HimVote.Core.Models;
using HimVote.Core.Services;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class CoreVerifierRunnerTests : IDisposable
{
    private readonly string _testRoot;

    public CoreVerifierRunnerTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"himvote_core_runner_{Guid.NewGuid():N}");
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
    public void ComputeVerifierChecksum_ValidFile_ReturnsCorrectDigest()
    {
        var dummyScript = Path.Combine(_testRoot, "dummy.py");
        var content = "print('HimVote verifier test')\n";
        File.WriteAllText(dummyScript, content);

        var runner = new VerifierRunner();
        var computed = runner.ComputeVerifierChecksum(dummyScript);

        var expectedHash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(dummyScript))).ToLowerInvariant();
        Assert.Equal(expectedHash, computed);
    }

    [Fact]
    public async Task RunVerifierAsync_ChecksumMismatch_ThrowsSecurityException()
    {
        var dummyScript = Path.Combine(_testRoot, "mismatch.py");
        File.WriteAllText(dummyScript, "print('hello')\n");

        var runner = new VerifierRunner();
        var options = new VerifierExecutionOptions
        {
            VerifierPath = dummyScript,
            ExpectedSha256Checksum = "0000000000000000000000000000000000000000000000000000000000000000",
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json")
        };

        await Assert.ThrowsAsync<SecurityException>(() => runner.RunVerifierAsync(options));
    }

    [Fact]
    public async Task RunVerifierAsync_MissingVerifier_ReturnsExitCode4()
    {
        var runner = new VerifierRunner();
        var options = new VerifierExecutionOptions
        {
            VerifierPath = Path.Combine(_testRoot, "does_not_exist.py"),
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json")
        };

        var result = await runner.RunVerifierAsync(options);
        Assert.False(result.Success);
        Assert.Equal(4, result.ExitCode);
        Assert.Contains("not found", result.ErrorMessage);
    }

    [Fact]
    public async Task RunVerifierAsync_ZeroExitWithoutReport_IsNotSuccessful()
    {
        var scriptPath = Path.Combine(_testRoot, "no_report.py");
        await File.WriteAllTextAsync(scriptPath, "import sys\nprint('finished without report')\nsys.exit(0)\n");

        var runner = new VerifierRunner();
        var result = await runner.RunVerifierAsync(new VerifierExecutionOptions
        {
            VerifierPath = scriptPath,
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json"),
            OutputReportPath = Path.Combine(_testRoot, "missing_report.json")
        });

        Assert.False(result.Success);
        Assert.Equal(0, result.ExitCode);
        Assert.NotNull(result.Report);
        Assert.Equal(PropertyStatuses.Unverifiable, result.Report.OverallStatus);
        Assert.Equal(FailureCodes.MissingReport, result.Report.Properties
            .Single(property => property.PropertyName == VerificationProperties.RecordIntegrity).FailureCode);
        Assert.Equal(PropertyStatuses.Limited, result.Report.Properties
            .Single(property => property.PropertyName == VerificationProperties.IndependentOperators).Status);
        Assert.Contains("complete PASS audit report", result.ErrorMessage);
    }
}
