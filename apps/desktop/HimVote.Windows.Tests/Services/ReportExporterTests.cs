using System.Text.Json;
using HimVote.Windows.Models;
using HimVote.Windows.Services;
using Xunit;

namespace HimVote.Windows.Tests.Services;

public class ReportExporterTests : IDisposable
{
    private readonly string _testRoot;

    public ReportExporterTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), "himvote_report_test_" + Guid.NewGuid().ToString("N"));
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

    private static AuditReport CreateSampleReport()
    {
        return new AuditReport
        {
            ElectionId = "elec_2026_annual",
            ManifestDigest = "sha256:fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
            VerifierChecksum = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
            VerifierVersion = "2.0.0",
            GeneratedAtUtc = DateTimeOffset.UtcNow,
            ExitCode = 0,
            OverallStatus = PropertyStatuses.Pass,
            RootComparison = new RootComparison
            {
                PublishedRoot = "sha256:1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
                ComputedRoot = "sha256:1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
                Matches = true
            },
            TallyComparison = new TallyComparison
            {
                PublishedTotalBallots = 100,
                ComputedTotalBallots = 100,
                Matches = true,
                Candidates = new List<CandidateTallyItem>
                {
                    new()
                    {
                        CandidateId = "cand_alice",
                        CandidateName = "Alice Student",
                        PublishedVotes = 60,
                        ComputedVotes = 60
                    },
                    new()
                    {
                        CandidateId = "cand_bob",
                        CandidateName = "Bob Student",
                        PublishedVotes = 40,
                        ComputedVotes = 40
                    }
                }
            },
            Properties = new List<VerificationPropertyItem>
            {
                new() { PropertyName = VerificationProperties.RecordIntegrity, Status = PropertyStatuses.Pass, FailureCode = FailureCodes.None, Summary = "Ballots verified" },
                new() { PropertyName = VerificationProperties.CredentialUniqueness, Status = PropertyStatuses.Pass, FailureCode = FailureCodes.None, Summary = "Nullifiers unique" },
                new() { PropertyName = VerificationProperties.RosterAttestation, Status = PropertyStatuses.Pass, FailureCode = FailureCodes.None, Summary = "Roster attested" },
                new() { PropertyName = VerificationProperties.TallyProof, Status = PropertyStatuses.Pass, FailureCode = FailureCodes.None, Summary = "Tally verified" },
                new() { PropertyName = VerificationProperties.AnchorFinality, Status = PropertyStatuses.Pass, FailureCode = FailureCodes.None, Summary = "Anchor final" }
            }
        };
    }

    [Fact]
    public void ExportToJson_ContainsRequiredFieldsAndChecksum()
    {
        var report = CreateSampleReport();
        var exporter = new ReportExporter();

        var json = exporter.ExportToJson(report);

        Assert.Contains(report.VerifierChecksum, json);
        Assert.Contains(report.ElectionId, json);
        Assert.Contains("RECORD_INTEGRITY", json);
        Assert.Contains("TALLY_PROOF", json);
        Assert.Contains("ANCHOR_FINALITY", json);
        Assert.Contains("cand_alice", json);

        using var doc = JsonDocument.Parse(json);
        Assert.NotNull(doc);
    }

    [Fact]
    public void ExportToText_ContainsSideBySideComparisonAndChecksum()
    {
        var report = CreateSampleReport();
        var exporter = new ReportExporter();

        var text = exporter.ExportToText(report);

        Assert.Contains(report.VerifierChecksum, text);
        Assert.Contains(report.ElectionId, text);
        Assert.Contains("Published Merkle Root", text);
        Assert.Contains("Computed Merkle Root", text);
        Assert.Contains("MATCH", text);
        Assert.Contains("Alice Student", text);
    }

    [Fact]
    public async Task ExportFilesAsync_CreatesValidFilesOnDisk()
    {
        var report = CreateSampleReport();
        var exporter = new ReportExporter();

        var jsonFile = Path.Combine(_testRoot, "report.json");
        var textFile = Path.Combine(_testRoot, "report.txt");

        await exporter.ExportToJsonFileAsync(report, jsonFile);
        await exporter.ExportToTextFileAsync(report, textFile);

        Assert.True(File.Exists(jsonFile));
        Assert.True(File.Exists(textFile));

        var jsonContent = await File.ReadAllTextAsync(jsonFile);
        var textContent = await File.ReadAllTextAsync(textFile);

        Assert.Contains(report.VerifierChecksum, jsonContent);
        Assert.Contains(report.VerifierChecksum, textContent);
    }
}
