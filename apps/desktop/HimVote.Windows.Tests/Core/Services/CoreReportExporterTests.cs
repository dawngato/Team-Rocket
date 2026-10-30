using HimVote.Core.Models;
using HimVote.Core.Services;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class CoreReportExporterTests
{
    private static AuditReport CreateSampleReport()
    {
        return new AuditReport
        {
            ElectionId = "elec_core_test",
            ManifestDigest = "sha256:abc12345",
            VerifierChecksum = "sha256:fedcba98",
            VerifierVersion = "2.0.0",
            OverallStatus = PropertyStatuses.Pass,
            ExitCode = 0,
            GeneratedAtUtc = DateTimeOffset.UtcNow,
            RootComparison = new RootComparison
            {
                PublishedRoot = "sha256:root_1",
                ComputedRoot = "sha256:root_1",
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
                        CandidateId = "c_1",
                        CandidateName = "Alice",
                        PublishedVotes = 60,
                        ComputedVotes = 60
                    },
                    new()
                    {
                        CandidateId = "c_2",
                        CandidateName = "Bob",
                        PublishedVotes = 40,
                        ComputedVotes = 40
                    }
                }
            },
            Properties = new List<VerificationPropertyItem>
            {
                new()
                {
                    PropertyName = VerificationProperties.RecordIntegrity,
                    Status = PropertyStatuses.Pass,
                    FailureCode = FailureCodes.None,
                    Summary = "Ballot records verified"
                },
                new()
                {
                    PropertyName = VerificationProperties.TallyProof,
                    Status = PropertyStatuses.Pass,
                    FailureCode = FailureCodes.None,
                    Summary = "Tally proofs verified"
                }
            }
        };
    }

    [Fact]
    public void ExportToJson_ProducesValidJsonWithVerifierHash()
    {
        var exporter = new ReportExporter();
        var report = CreateSampleReport();

        var json = exporter.ExportToJson(report);

        Assert.Contains("elec_core_test", json);
        Assert.Contains("sha256:abc12345", json);
        Assert.Contains("sha256:fedcba98", json);
        Assert.Contains("RECORD_INTEGRITY", json);
    }

    [Fact]
    public void ExportToText_ProducesFormattedReport()
    {
        var exporter = new ReportExporter();
        var report = CreateSampleReport();

        var text = exporter.ExportToText(report);

        Assert.Contains("HIMVOTE INSTITUTIONAL AUDIT REPORT", text);
        Assert.Contains("elec_core_test", text);
        Assert.Contains("Published Merkle Root", text);
        Assert.Contains("MATCH", text);
        Assert.Contains("Alice", text);
        Assert.Contains("Bob", text);
    }
}
