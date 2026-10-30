using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreAuditExplorerViewModelTests
{
    [Fact]
    public async Task RunVerificationAsync_Success_PopulatesComparisonsAndProperties()
    {
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();

        var sampleReport = new AuditReport
        {
            ElectionId = "elec_test_core",
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
                        PublishedVotes = 50,
                        ComputedVotes = 50
                    }
                }
            },
            Properties = new List<VerificationPropertyItem>
            {
                new() { PropertyName = VerificationProperties.RecordIntegrity, Status = PropertyStatuses.Pass },
                new() { PropertyName = VerificationProperties.CredentialUniqueness, Status = PropertyStatuses.Pass }
            }
        };

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
        Assert.Equal(2, vm.Properties.Count);
        Assert.Single(vm.CandidateTallyComparisons);
    }

    [Fact]
    public async Task RunVerificationAsync_MissingEvidencePath_SetsErrorMessage()
    {
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();

        var vm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object)
        {
            EvidenceDirectoryPath = "",
            TrustPinsFilePath = "/path/to/trust.json"
        };

        await vm.RunVerificationAsync();

        Assert.Contains("Evidence directory path is required", vm.ErrorMessage);
        Assert.False(vm.VerificationCompleted);
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
            CurrentReport = new AuditReport { OverallStatus = PropertyStatuses.Pass },
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
