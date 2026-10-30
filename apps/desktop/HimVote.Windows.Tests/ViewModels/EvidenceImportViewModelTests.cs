using HimVote.Windows.Models;
using HimVote.Windows.Services;
using HimVote.Windows.ViewModels;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.ViewModels;

public class EvidenceImportViewModelTests
{
    [Fact]
    public async Task ExtractArchiveAsync_ValidArchive_UpdatesExtractedFiles()
    {
        var mockImporter = new Mock<IEvidenceImporter>();
        var mockPinStore = new Mock<ITrustPinStore>();

        mockImporter.Setup(x => x.ExtractArchiveAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ExtractionResult
                    {
                        Success = true,
                        FileCount = 3,
                        TotalBytesExtracted = 4096,
                        ExtractedFiles = new[] { "manifest.json", "ballots.json", "checkpoint.json" }
                    });

        var vm = new EvidenceImportViewModel(mockImporter.Object, mockPinStore.Object)
        {
            ZipFilePath = "/path/to/archive.zip"
        };

        await vm.ExtractArchiveAsync();

        Assert.True(vm.ExtractionCompleted);
        Assert.Equal(3, vm.ExtractedCount);
        Assert.Equal(3, vm.ExtractedFiles.Count);
        Assert.Null(vm.ErrorMessage);
    }

    [Fact]
    public async Task ImportTrustPinsAsync_ValidExternalFile_MarksTrustPinsLoaded()
    {
        var mockImporter = new Mock<IEvidenceImporter>();
        var mockPinStore = new Mock<ITrustPinStore>();

        mockPinStore.Setup(x => x.ImportFromFileAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new TrustPins
                    {
                        ManifestDigest = "sha256:abc",
                        WitnessPublicKey = "ed25519:witness",
                        AuthorityPublicKey = "ed25519:auth"
                    });

        var vm = new EvidenceImportViewModel(mockImporter.Object, mockPinStore.Object)
        {
            TrustPinsFilePath = "/path/to/pinned_trust.json"
        };

        await vm.ImportTrustPinsAsync();

        Assert.True(vm.TrustPinsLoaded);
        Assert.NotNull(vm.CurrentTrustPins);
        Assert.Null(vm.ErrorMessage);
    }
}
