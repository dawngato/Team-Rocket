using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Windows.Models;
using HimVote.Windows.Services;

namespace HimVote.Windows.ViewModels;

public class AuditExplorerViewModel : ObservableObject
{
    private readonly IVerifierRunner _verifierRunner;
    private readonly IReportExporter _reportExporter;

    private string _evidenceDirectoryPath = string.Empty;
    private string _trustPinsFilePath = string.Empty;
    private string _verifierScriptPath = string.Empty;
    private string _expectedVerifierChecksum = string.Empty;
    private string _actualVerifierChecksum = string.Empty;

    private bool _isVerifying;
    private bool _verificationCompleted;
    private string _overallStatus = PropertyStatuses.Unverifiable;
    private int _exitCode = -1;
    private string? _errorMessage;
    private string? _statusMessage;

    private string _publishedRoot = string.Empty;
    private string _computedRoot = string.Empty;
    private bool _rootsMatch;

    private int _publishedTotalBallots;
    private int _computedTotalBallots;
    private bool _talliesMatch;
    private bool _allowDevelopmentProfile;

    private AuditReport? _currentReport;

    public ObservableCollection<VerificationPropertyItem> Properties { get; } = new();
    public ObservableCollection<CandidateTallyItem> CandidateTallyComparisons { get; } = new();

    public string EvidenceDirectoryPath
    {
        get => _evidenceDirectoryPath;
        set => SetProperty(ref _evidenceDirectoryPath, value);
    }

    public string TrustPinsFilePath
    {
        get => _trustPinsFilePath;
        set => SetProperty(ref _trustPinsFilePath, value);
    }

    public string VerifierScriptPath
    {
        get => _verifierScriptPath;
        set => SetProperty(ref _verifierScriptPath, value);
    }

    public string ExpectedVerifierChecksum
    {
        get => _expectedVerifierChecksum;
        set => SetProperty(ref _expectedVerifierChecksum, value);
    }

    public string ActualVerifierChecksum
    {
        get => _actualVerifierChecksum;
        set => SetProperty(ref _actualVerifierChecksum, value);
    }

    public bool IsVerifying
    {
        get => _isVerifying;
        set => SetProperty(ref _isVerifying, value);
    }

    public bool VerificationCompleted
    {
        get => _verificationCompleted;
        set => SetProperty(ref _verificationCompleted, value);
    }

    public string OverallStatus
    {
        get => _overallStatus;
        set => SetProperty(ref _overallStatus, value);
    }

    public int ExitCode
    {
        get => _exitCode;
        set => SetProperty(ref _exitCode, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool AllowDevelopmentProfile
    {
        get => _allowDevelopmentProfile;
        set => SetProperty(ref _allowDevelopmentProfile, value);
    }

    public string PublishedRoot
    {
        get => _publishedRoot;
        set => SetProperty(ref _publishedRoot, value);
    }

    public string ComputedRoot
    {
        get => _computedRoot;
        set => SetProperty(ref _computedRoot, value);
    }

    public bool RootsMatch
    {
        get => _rootsMatch;
        set => SetProperty(ref _rootsMatch, value);
    }

    public int PublishedTotalBallots
    {
        get => _publishedTotalBallots;
        set => SetProperty(ref _publishedTotalBallots, value);
    }

    public int ComputedTotalBallots
    {
        get => _computedTotalBallots;
        set => SetProperty(ref _computedTotalBallots, value);
    }

    public bool TalliesMatch
    {
        get => _talliesMatch;
        set => SetProperty(ref _talliesMatch, value);
    }

    public AuditReport? CurrentReport
    {
        get => _currentReport;
        set => SetProperty(ref _currentReport, value);
    }

    public IAsyncRelayCommand RunVerificationCommand { get; }
    public IAsyncRelayCommand<string> ExportJsonReportCommand { get; }
    public IAsyncRelayCommand<string> ExportTextReportCommand { get; }

    public AuditExplorerViewModel(IVerifierRunner verifierRunner, IReportExporter reportExporter)
    {
        _verifierRunner = verifierRunner;
        _reportExporter = reportExporter;

        RunVerificationCommand = new AsyncRelayCommand(RunVerificationAsync, () => !IsVerifying);
        ExportJsonReportCommand = new AsyncRelayCommand<string>(ExportJsonReportAsync);
        ExportTextReportCommand = new AsyncRelayCommand<string>(ExportTextReportAsync);
    }

    public async Task RunVerificationAsync()
    {
        if (string.IsNullOrWhiteSpace(EvidenceDirectoryPath))
        {
            ErrorMessage = "Evidence directory path is required.";
            return;
        }

        if (string.IsNullOrWhiteSpace(TrustPinsFilePath))
        {
            ErrorMessage = "Trust pins file path is required.";
            return;
        }

        if (string.IsNullOrWhiteSpace(VerifierScriptPath))
        {
            ErrorMessage = "Verifier path is required.";
            return;
        }

        try
        {
            IsVerifying = true;
            VerificationCompleted = false;
            ErrorMessage = null;
            StatusMessage = "Computing verifier checksum and launching sandboxed process...";

            var options = new VerifierExecutionOptions
            {
                VerifierPath = VerifierScriptPath,
                ExpectedSha256Checksum = ExpectedVerifierChecksum,
                ExportDirectory = EvidenceDirectoryPath,
                TrustPinsFilePath = TrustPinsFilePath,
                AllowDevelopmentProfile = AllowDevelopmentProfile
            };

            var result = await _verifierRunner.RunVerifierAsync(options);
            ActualVerifierChecksum = result.VerifierChecksum;
            ExitCode = result.ExitCode;

            if (result.Report != null)
            {
                CurrentReport = result.Report;
                OverallStatus = result.Report.OverallStatus;
                PublishedRoot = result.Report.RootComparison.PublishedRoot;
                ComputedRoot = result.Report.RootComparison.ComputedRoot;
                RootsMatch = result.Report.RootComparison.Matches;

                PublishedTotalBallots = result.Report.TallyComparison.PublishedTotalBallots;
                ComputedTotalBallots = result.Report.TallyComparison.ComputedTotalBallots;
                TalliesMatch = result.Report.TallyComparison.Matches;

                Properties.Clear();
                foreach (var prop in result.Report.Properties)
                {
                    Properties.Add(prop);
                }

                CandidateTallyComparisons.Clear();
                foreach (var item in result.Report.TallyComparison.Candidates)
                {
                    CandidateTallyComparisons.Add(item);
                }
            }

            VerificationCompleted = true;
            StatusMessage = result.Success
                ? "Audit verification completed successfully. All mandatory checks passed."
                : $"Audit finished with status {OverallStatus} (Exit code {ExitCode}).";
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
            OverallStatus = PropertyStatuses.Fail;
            StatusMessage = null;
        }
        finally
        {
            IsVerifying = false;
        }
    }

    public async Task ExportJsonReportAsync(string? targetFilePath)
    {
        if (CurrentReport == null)
        {
            ErrorMessage = "No verification report available to export.";
            return;
        }

        var path = string.IsNullOrWhiteSpace(targetFilePath)
            ? Path.Combine(Path.GetTempPath(), $"himvote_audit_report_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.json")
            : targetFilePath;

        try
        {
            await _reportExporter.ExportToJsonFileAsync(CurrentReport, path);
            StatusMessage = $"Exported deterministic JSON audit report to {path}";
        }
        catch (Exception ex)
        {
            ErrorMessage = $"JSON report export failed: {ex.Message}";
        }
    }

    public async Task ExportTextReportAsync(string? targetFilePath)
    {
        if (CurrentReport == null)
        {
            ErrorMessage = "No verification report available to export.";
            return;
        }

        var path = string.IsNullOrWhiteSpace(targetFilePath)
            ? Path.Combine(Path.GetTempPath(), $"himvote_audit_report_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.txt")
            : targetFilePath;

        try
        {
            await _reportExporter.ExportToTextFileAsync(CurrentReport, path);
            StatusMessage = $"Exported human readable text audit report to {path}";
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Text report export failed: {ex.Message}";
        }
    }
}
