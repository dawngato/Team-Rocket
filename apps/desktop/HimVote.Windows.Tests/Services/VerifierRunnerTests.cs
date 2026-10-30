using System.Security;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HimVote.Windows.Models;
using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class VerifierRunnerTests : IDisposable
{
    private readonly string _testRoot;

    public VerifierRunnerTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), "himvote_verifier_test_" + Guid.NewGuid().ToString("N"));
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
    public void ComputeVerifierChecksum_ValidFile_ReturnsExpectedSha256()
    {
        var testFile = Path.Combine(_testRoot, "dummy_verifier.py");
        File.WriteAllText(testFile, "print('HimVote Verifier')\n");

        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("print('HimVote Verifier')\n"))).ToLowerInvariant();

        var runner = new VerifierRunner();
        var actualHash = runner.ComputeVerifierChecksum(testFile);

        Assert.Equal(expectedHash, actualHash);
    }

    [Fact]
    public async Task RunVerifierAsync_ChecksumMismatch_ThrowsSecurityException()
    {
        var scriptPath = Path.Combine(_testRoot, "tampered_verifier.py");
        File.WriteAllText(scriptPath, "print('Tampered script')\n");

        var runner = new VerifierRunner();
        var options = new VerifierExecutionOptions
        {
            VerifierPath = scriptPath,
            ExpectedSha256Checksum = "0000000000000000000000000000000000000000000000000000000000000000",
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json")
        };

        var exception = await Assert.ThrowsAsync<SecurityException>(() =>
            runner.RunVerifierAsync(options));

        Assert.Contains("Verifier integrity check failed", exception.Message);
    }

    [Fact]
    public async Task RunVerifierAsync_SuccessfulExecution_ParsesReport()
    {
        var scriptPath = Path.Combine(_testRoot, "mock_success_verifier.py");
        var reportPath = Path.Combine(_testRoot, "output_report.json");

        var scriptCode = @"
import sys
import json
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('command')
parser.add_argument('--export')
parser.add_argument('--trust')
parser.add_argument('--report')
args = parser.parse_args()
assert args.command == 'audit_evidence', args.command

report_data = {
    'election_id': 'elec_test_001',
    'manifest_digest': 'sha256:11112222333344445555666677778888',
    'verifier_checksum': 'checksum123',
    'verifier_version': '2.0.0',
    'generated_at_utc': '2026-10-30T12:00:00Z',
    'exit_code': 0,
    'overall_status': 'PASS',
    'root_comparison': {
        'published_root': 'sha256:aabbcc',
        'computed_root': 'sha256:aabbcc',
        'matches': True
    },
    'tally_comparison': {
        'published_total_ballots': 42,
        'computed_total_ballots': 42,
        'matches': True,
        'candidates': [
            {
                'candidate_id': 'cand_1',
                'candidate_name': 'Alice Candidate',
                'published_votes': 25,
                'computed_votes': 25,
                'matches': True
            },
            {
                'candidate_id': 'cand_2',
                'candidate_name': 'Bob Candidate',
                'published_votes': 17,
                'computed_votes': 17,
                'matches': True
            }
        ]
    },
    'properties': [
        {
            'property_name': 'RECORD_INTEGRITY',
            'status': 'PASS',
            'failure_code': 'NONE',
            'summary': 'All Merkle proofs validated successfully'
        },
        {
            'property_name': 'CREDENTIAL_UNIQUENESS',
            'status': 'PASS',
            'failure_code': 'NONE',
            'summary': 'Nullifiers unique and properly blinded'
        },
        {
            'property_name': 'ROSTER_ATTESTATION',
            'status': 'PASS',
            'failure_code': 'NONE',
            'summary': 'Roster attestation signed by authorized registrar'
        },
        {
            'property_name': 'TALLY_PROOF',
            'status': 'PASS',
            'failure_code': 'NONE',
            'summary': 'Engine tally verified against native proofs'
        },
        {
            'property_name': 'ANCHOR_FINALITY',
            'status': 'PASS',
            'failure_code': 'NONE',
            'summary': 'Anchored commitment confirmed on consortium chain'
        }
    ]
}

with open(args.report, 'w') as f:
    json.dump(report_data, f)

print('Verification finished with exit code 0')
sys.exit(0)
";
        await File.WriteAllTextAsync(scriptPath, scriptCode);

        var runner = new VerifierRunner();
        var actualHash = runner.ComputeVerifierChecksum(scriptPath);

        var options = new VerifierExecutionOptions
        {
            VerifierPath = scriptPath,
            ExpectedSha256Checksum = actualHash,
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json"),
            OutputReportPath = reportPath
        };

        var result = await runner.RunVerifierAsync(options);

        Assert.True(result.Success);
        Assert.Equal(0, result.ExitCode);
        Assert.NotNull(result.Report);
        Assert.Equal("elec_test_001", result.Report.ElectionId);
        Assert.Equal(PropertyStatuses.Pass, result.Report.OverallStatus);
        Assert.True(result.Report.RootComparison.Matches);
        Assert.True(result.Report.TallyComparison.Matches);
        Assert.Equal(5, result.Report.Properties.Count);
        Assert.All(result.Report.Properties, p => Assert.Equal(PropertyStatuses.Pass, p.Status));
    }

    [Fact]
    public async Task RunVerifierAsync_ZeroExitWithoutReport_IsNotSuccessful()
    {
        var scriptPath = Path.Combine(_testRoot, "mock_no_report_verifier.py");
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
        Assert.Contains("complete PASS audit report", result.ErrorMessage);
    }

    [Fact]
    public async Task RunVerifierAsync_FailureExecution_HandlesNonZeroExitCode()
    {
        var scriptPath = Path.Combine(_testRoot, "mock_fail_verifier.py");
        var scriptCode = @"
import sys
print('Cryptographic failure detected: BAD_SIGNATURE')
sys.exit(2)
";
        await File.WriteAllTextAsync(scriptPath, scriptCode);

        var runner = new VerifierRunner();
        var actualHash = runner.ComputeVerifierChecksum(scriptPath);

        var options = new VerifierExecutionOptions
        {
            VerifierPath = scriptPath,
            ExpectedSha256Checksum = actualHash,
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json")
        };

        var result = await runner.RunVerifierAsync(options);

        Assert.False(result.Success);
        Assert.Equal(2, result.ExitCode);
        Assert.NotNull(result.Report);
        Assert.Equal(PropertyStatuses.Fail, result.Report.OverallStatus);

        var recordIntegrityProp = result.Report.Properties.First(p => p.PropertyName == VerificationProperties.RecordIntegrity);
        Assert.Equal(PropertyStatuses.Fail, recordIntegrityProp.Status);
        Assert.Equal(FailureCodes.BadSignature, recordIntegrityProp.FailureCode);
    }

    [Fact]
    public async Task RunVerifierAsync_UnverifiableExitCode3_MapsToUnverifiableAndStaleCheckpoint()
    {
        var scriptPath = Path.Combine(_testRoot, "mock_stale_verifier.py");
        var scriptCode = @"
import sys
print('Unverifiable state: STALE_CHECKPOINT')
sys.exit(3)
";
        await File.WriteAllTextAsync(scriptPath, scriptCode);

        var runner = new VerifierRunner();
        var actualHash = runner.ComputeVerifierChecksum(scriptPath);

        var options = new VerifierExecutionOptions
        {
            VerifierPath = scriptPath,
            ExpectedSha256Checksum = actualHash,
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json")
        };

        var result = await runner.RunVerifierAsync(options);

        Assert.False(result.Success);
        Assert.Equal(3, result.ExitCode);
        Assert.NotNull(result.Report);
        Assert.Equal(PropertyStatuses.Unverifiable, result.Report.OverallStatus);

        var recordIntegrityProp = result.Report.Properties.First(p => p.PropertyName == VerificationProperties.RecordIntegrity);
        Assert.Equal(PropertyStatuses.Unverifiable, recordIntegrityProp.Status);
        Assert.Equal(FailureCodes.StaleCheckpoint, recordIntegrityProp.FailureCode);
    }

    [Fact]
    public async Task RunVerifierAsync_BadArchiveExitCode4_MapsToTruncatedFailure()
    {
        var scriptPath = Path.Combine(_testRoot, "mock_truncated_verifier.py");
        var scriptCode = @"
import sys
print('Bad archive or truncated payload')
sys.exit(4)
";
        await File.WriteAllTextAsync(scriptPath, scriptCode);

        var runner = new VerifierRunner();
        var actualHash = runner.ComputeVerifierChecksum(scriptPath);

        var options = new VerifierExecutionOptions
        {
            VerifierPath = scriptPath,
            ExpectedSha256Checksum = actualHash,
            ExportDirectory = _testRoot,
            TrustPinsFilePath = Path.Combine(_testRoot, "pins.json")
        };

        var result = await runner.RunVerifierAsync(options);

        Assert.False(result.Success);
        Assert.Equal(4, result.ExitCode);
        Assert.NotNull(result.Report);
        Assert.Equal(PropertyStatuses.Fail, result.Report.OverallStatus);

        var recordIntegrityProp = result.Report.Properties.First(p => p.PropertyName == VerificationProperties.RecordIntegrity);
        Assert.Equal(FailureCodes.Truncated, recordIntegrityProp.FailureCode);
    }
}
