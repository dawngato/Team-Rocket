using System.Diagnostics;
using HimVote.Core.Models;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using Xunit;

namespace HimVote.Windows.Tests.Core.Services;

public class EndToEndAuditVerificationTests : IDisposable
{
    private readonly string _testRoot;
    private readonly string _verifierScriptPath;

    public EndToEndAuditVerificationTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), $"himvote_e2e_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testRoot);
        _verifierScriptPath = "/home/Kali/Desktop/HPTU/Team-Rocket/verifier/verify.py";
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
    public async Task EndToEnd_OfflineEvidenceExtraction_And_VerifierExecution_Passes()
    {
        // 1. Generate election evidence bundle via Python fixture helper
        var pythonCode = $@"
import sys, tempfile, json, os, zipfile
sys.path.insert(0, '/home/Kali/Desktop/HPTU/Team-Rocket')
from tests.test_verifier import ElectionFixtureHelper

class TmpFactory:
    def mktemp(self, name):
        return '{_testRoot}/fixture'

os.makedirs('{_testRoot}/fixture', exist_ok=True)
helper = ElectionFixtureHelper(TmpFactory())
bundle = helper.build_valid_election_bundle(num_ballots=3, export_as_archive=True)

manifest_digest = bundle['manifest_digest']
zip_export = bundle['export']
trust_pins = bundle['trust']
final_cp = bundle['final']
roster = bundle['roster']
issuance = bundle['issuance']
chain = bundle['chain']

print(f'ZIP:{{zip_export}}')
print(f'TRUST:{{trust_pins}}')
print(f'DIGEST:{{manifest_digest}}')
";
        var psi = new ProcessStartInfo
        {
            FileName = "python3",
            Arguments = $"-c \"{pythonCode.Replace("\"", "\\\"")}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var pyProcess = Process.Start(psi)!;
        var stdout = await pyProcess.StandardOutput.ReadToEndAsync();
        var stderr = await pyProcess.StandardError.ReadToEndAsync();
        await pyProcess.WaitForExitAsync();

        Assert.Equal(0, pyProcess.ExitCode);

        string zipPath = "";
        string trustPinsPath = "";

        foreach (var line in stdout.Split('\n'))
        {
            if (line.StartsWith("ZIP:")) zipPath = line.Substring(4).Trim();
            if (line.StartsWith("TRUST:")) trustPinsPath = line.Substring(6).Trim();
        }

        Assert.True(File.Exists(zipPath));
        Assert.True(File.Exists(trustPinsPath));

        // 2. Safe ZIP extraction via EvidenceImporter
        var extractDest = Path.Combine(_testRoot, "extracted_evidence");
        var importer = new EvidenceImporter();
        var extractResult = await importer.ExtractArchiveAsync(zipPath, extractDest);

        Assert.True(extractResult.Success);
        Assert.True(extractResult.FileCount > 0);
        Assert.True(File.Exists(Path.Combine(extractDest, "manifest.json")));
        Assert.True(File.Exists(Path.Combine(extractDest, "leaves.json")));
        Assert.True(File.Exists(Path.Combine(extractDest, "results.json")));

        // 3. Isolated trust pin store verification
        var storePath = Path.Combine(_testRoot, "pin_store.json");
        var pinStore = new TrustPinStore(storePath);

        // Security check: attempting to load pins from inside the extracted archive must fail
        var fakeTrapFile = Path.Combine(extractDest, "trap_pins.json");
        File.Copy(trustPinsPath, fakeTrapFile);

        await Assert.ThrowsAsync<System.Security.SecurityException>(() =>
            pinStore.ImportFromFileAsync(fakeTrapFile, forbiddenArchiveDirectory: extractDest));

        // Importing external trust pins must succeed
        var loadedPins = await pinStore.ImportFromFileAsync(trustPinsPath, forbiddenArchiveDirectory: extractDest);
        Assert.NotNull(loadedPins);
        Assert.True(!string.IsNullOrWhiteSpace(loadedPins.ManifestDigest) || !string.IsNullOrWhiteSpace(loadedPins.ElectionId));

        // Also copy ancillary files to extraction dir for verifier invocation if needed
        var parentBundleDir = Path.GetDirectoryName(zipPath)!;
        foreach (var extra in new[] { "final_checkpoint.json", "roster_approval.json", "issuance_closure.json", "chain_anchor.json" })
        {
            var src = Path.Combine(parentBundleDir, extra);
            if (File.Exists(src))
            {
                File.Copy(src, Path.Combine(extractDest, extra), overwrite: true);
            }
        }

        // 4. Verifier execution via VerifierRunner
        var runner = new VerifierRunner();
        var expectedSha = runner.ComputeVerifierChecksum(_verifierScriptPath);
        Assert.False(string.IsNullOrWhiteSpace(expectedSha));

        var execOptions = new VerifierExecutionOptions
        {
            VerifierPath = _verifierScriptPath,
            ExpectedSha256Checksum = expectedSha,
            ExportDirectory = extractDest,
            TrustPinsFilePath = trustPinsPath,
            Timeout = TimeSpan.FromSeconds(30)
        };

        var verifierResult = await runner.RunVerifierAsync(execOptions);

        Assert.True(verifierResult.Success);
        Assert.Equal(0, verifierResult.ExitCode);
        Assert.NotNull(verifierResult.Report);
        Assert.Equal(PropertyStatuses.Pass, verifierResult.Report.OverallStatus);
        Assert.True(verifierResult.Report.RootComparison.Matches);
        Assert.True(verifierResult.Report.TallyComparison.Matches);

        // 5. Test AuditExplorerViewModel with the executed report
        var exporter = new ReportExporter();
        var auditVm = new AuditExplorerViewModel(runner, exporter)
        {
            EvidenceDirectoryPath = extractDest,
            TrustPinsFilePath = trustPinsPath,
            VerifierScriptPath = _verifierScriptPath,
            ExpectedVerifierChecksum = expectedSha
        };

        await auditVm.RunVerificationAsync();

        Assert.True(auditVm.VerificationCompleted);
        Assert.Equal(PropertyStatuses.Pass, auditVm.OverallStatus);
        Assert.Equal(0, auditVm.ExitCode);
        Assert.True(auditVm.RootsMatch);
        Assert.True(auditVm.TalliesMatch);
        Assert.NotEmpty(auditVm.Properties);

        // 6. Test deterministic export
        var exportedJson = Path.Combine(_testRoot, "audit_report.json");
        var exportedText = Path.Combine(_testRoot, "audit_report.txt");

        await auditVm.ExportJsonReportAsync(exportedJson);
        await auditVm.ExportTextReportAsync(exportedText);

        Assert.True(File.Exists(exportedJson));
        Assert.True(File.Exists(exportedText));

        var jsonContent = await File.ReadAllTextAsync(exportedJson);
        Assert.Contains(loadedPins.ManifestDigest, jsonContent);
        Assert.Contains("RECORD_INTEGRITY", jsonContent);

        var textContent = await File.ReadAllTextAsync(exportedText);
        Assert.Contains("HIMVOTE INSTITUTIONAL AUDIT REPORT", textContent);
        Assert.Contains("MATCH", textContent);
    }
}
