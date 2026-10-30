using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Core.ViewModels;

public class CoreEvidenceImportViewModelTests
{
    [Fact]
    public async Task ExtractArchiveAsync_Success_PopulatesFilesAndSetsCompleted()
    {
        var mockImporter = new Mock<IEvidenceImporter>();
        var mockStore = new Mock<ITrustPinStore>();

        mockImporter.Setup(x => x.ExtractArchiveAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ExtractionResult
                    {
                        Success = true,
                        DestinationDirectory = "/tmp/evidence_dest",
                        FileCount = 3,
                        TotalBytesExtracted = 1024,
                        ExtractedFiles = new[] { "/tmp/evidence_dest/manifest.json", "/tmp/evidence_dest/leaves.json" }
                    });

        var vm = new EvidenceImportViewModel(mockImporter.Object, mockStore.Object)
        {
            ZipFilePath = "/tmp/election_archive.zip",
            DestinationDirectory = "/tmp/evidence_dest"
        };

        await vm.ExtractArchiveAsync();

        Assert.True(vm.ExtractionCompleted);
        Assert.Equal(3, vm.ExtractedCount);
        Assert.Equal(1024, vm.TotalBytesExtracted);
        Assert.Equal(2, vm.ExtractedFiles.Count);
        Assert.Contains("Safely extracted", vm.StatusMessage);
    }

    [Fact]
    public async Task ImportTrustPinsAsync_Success_SetsPinsAndReadyForAudit()
    {
        var mockImporter = new Mock<IEvidenceImporter>();
        var mockStore = new Mock<ITrustPinStore>();

        var pins = new TrustPins
        {
            ManifestDigest = "sha256:abc",
            WitnessPublicKey = "pub_wit",
            AuthorityPublicKey = "pub_auth"
        };

        mockStore.Setup(x => x.ImportFromFileAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(pins);

        var vm = new EvidenceImportViewModel(mockImporter.Object, mockStore.Object)
        {
            TrustPinsFilePath = "/tmp/pins.json",
            ExtractionCompleted = true
        };

        await vm.ImportTrustPinsAsync();

        Assert.True(vm.TrustPinsLoaded);
        Assert.NotNull(vm.CurrentTrustPins);
        Assert.True(vm.IsReadyForAudit);
    }
}
