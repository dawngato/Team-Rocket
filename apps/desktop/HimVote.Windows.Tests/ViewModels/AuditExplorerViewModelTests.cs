using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class AuditExplorerViewModelTests
{
    private static AuditReport CreateMockReport()
    {
        return new AuditReport
        {
            ElectionId = "elec_test_001",
            ManifestDigest = "sha256:1234",
            VerifierChecksum = "checksum_abc",
            VerifierVersion = "2.0.0",
            OverallStatus = PropertyStatuses.Pass,
            ExitCode = 0,
            RootComparison = new RootComparison
            {
                PublishedRoot = "sha256:root_pub",
                ComputedRoot = "sha256:root_pub",
                Matches = true
            },
            TallyComparison = new TallyComparison
            {
                PublishedTotalBallots = 50,
                ComputedTotalBallots = 50,
                Matches = true,
                Candidates = new List<CandidateTallyItem>
                {
                    new()
                    {
                        CandidateId = "c1",
                        CandidateName = "Alice",
                        PublishedVotes = 30,
                        ComputedVotes = 30
                    }
                }
            },
            Properties = new List<VerificationPropertyItem>
            {
                new() { PropertyName = VerificationProperties.RecordIntegrity, Status = PropertyStatuses.Pass },
                new() { PropertyName = VerificationProperties.CredentialUniqueness, Status = PropertyStatuses.Pass },
                new() { PropertyName = VerificationProperties.RosterAttestation, Status = PropertyStatuses.Pass },
                new() { PropertyName = VerificationProperties.TallyProof, Status = PropertyStatuses.Pass },
                new() { PropertyName = VerificationProperties.AnchorFinality, Status = PropertyStatuses.Pass }
            }
        };
    }

    [Fact]
    public async Task RunVerificationAsync_Success_PopulatesComparisonsAndProperties()
    {
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();

        var sampleReport = CreateMockReport();

        mockRunner.Setup(x => x.RunVerifierAsync(It.IsAny<VerifierExecutionOptions>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new VerifierExecutionResult
                  {
                      Success = true,
                      ExitCode = 0,
                      VerifierChecksum = "checksum_abc",
                      Report = sampleReport
                  });

        var vm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object)
        {
            EvidenceDirectoryPath = "/path/to/extracted/evidence",
            TrustPinsFilePath = "/path/to/pinned_trust.json",
            VerifierScriptPath = "/path/to/verify.py"
        };

        await vm.RunVerificationAsync();

        Assert.True(vm.VerificationCompleted);
        Assert.Equal(PropertyStatuses.Pass, vm.OverallStatus);
        Assert.Equal(0, vm.ExitCode);
        Assert.Equal("sha256:root_pub", vm.PublishedRoot);
        Assert.Equal("sha256:root_pub", vm.ComputedRoot);
        Assert.True(vm.RootsMatch);
        Assert.True(vm.TalliesMatch);
        Assert.Equal(5, vm.Properties.Count);
        Assert.Single(vm.CandidateTallyComparisons);
    }

    [Fact]
    public async Task ExportJsonReportAsync_WithReport_CallsExporter()
    {
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();

        var sampleReport = CreateMockReport();

        var vm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object)
        {
            CurrentReport = sampleReport
        };

        await vm.ExportJsonReportAsync("/tmp/exported.json");

        mockExporter.Verify(x => x.ExportToJsonFileAsync(sampleReport, "/tmp/exported.json", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Exported deterministic JSON audit report", vm.StatusMessage);
    }

    [Fact]
    public async Task ExportTextReportAsync_WithReport_CallsExporter()
    {
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();

        var sampleReport = CreateMockReport();

        var vm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object)
        {
            CurrentReport = sampleReport
        };

        await vm.ExportTextReportAsync("/tmp/exported.txt");

        mockExporter.Verify(x => x.ExportToTextFileAsync(sampleReport, "/tmp/exported.txt", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Contains("Exported human readable text audit report", vm.StatusMessage);
    }

    [Fact]
    public async Task RunVerificationAsync_WhenRunnerThrows_ClearsPriorReportState()
    {
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();
        mockRunner.Setup(x => x.RunVerifierAsync(It.IsAny<VerifierExecutionOptions>(), It.IsAny<CancellationToken>()))
                  .ThrowsAsync(new InvalidOperationException("verifier unavailable"));

        var vm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object)
        {
            EvidenceDirectoryPath = "/path/to/evidence",
            TrustPinsFilePath = "/path/to/trust.json",
            VerifierScriptPath = "/path/to/verify.py",
            CurrentReport = CreateMockReport(),
            RootsMatch = true,
            TalliesMatch = true
        };
        vm.Properties.Add(new VerificationPropertyItem
        {
            PropertyName = VerificationProperties.RecordIntegrity,
            Status = PropertyStatuses.Pass
        });

        await vm.RunVerificationAsync();

        Assert.Null(vm.CurrentReport);
        Assert.Empty(vm.Properties);
        Assert.False(vm.RootsMatch);
        Assert.False(vm.TalliesMatch);
        Assert.Equal(PropertyStatuses.Fail, vm.OverallStatus);
        Assert.Contains("verifier unavailable", vm.ErrorMessage);
    }
}
