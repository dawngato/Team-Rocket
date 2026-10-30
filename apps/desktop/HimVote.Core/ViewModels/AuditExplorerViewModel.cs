using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Core.Models;
using HimVote.Core.Services;

namespace HimVote.Core.ViewModels;

public class AuditExplorerViewModel : ViewModelBase
{
    private readonly IVerifierRunner _verifierRunner;
    private readonly IReportExporter _reportExporter;
    private readonly ITrustPinStore? _trustPinStore;

    private string _evidenceDirectoryPath = string.Empty;
    private string _trustPinsFilePath = string.Empty;
    private string _verifierScriptPath = string.Empty;
    private string _expectedVerifierChecksum = string.Empty;
    private string _actualVerifierChecksum = string.Empty;

    private bool _isVerifying;
    private bool _verificationCompleted;
    private string _overallStatus = PropertyStatuses.Unverifiable;
    private int _exitCode = -1;
    private string? _statusMessage;

    private string _publishedRoot = string.Empty;
    private string _computedRoot = string.Empty;
    private bool _rootsMatch;

    private int _publishedTotalBallots;
    private int _computedTotalBallots;
    private bool _talliesMatch;

    private AuditReport? _currentReport;

    public ObservableCollection<VerificationPropertyItem> Properties { get; } = new();
    public ObservableCollection<CandidateTallyItem> CandidateTallyComparisons { get; } = new();

    public string EvidenceDirectoryPath
    {
        get => _evidenceDirectoryPath;
        set
        {
            if (SetProperty(ref _evidenceDirectoryPath, value))
            {
                OnPropertyChanged(nameof(EvidencePath));
            }
        }
    }

    // Convenient alias for XAML bindings
    public string EvidencePath
    {
        get => EvidenceDirectoryPath;
        set => EvidenceDirectoryPath = value;
    }

    public string TrustPinsFilePath
    {
        get => _trustPinsFilePath;
        set
        {
            if (SetProperty(ref _trustPinsFilePath, value))
            {
                OnPropertyChanged(nameof(TrustPinsPath));
            }
        }
    }

    // Convenient alias for XAML bindings
    public string TrustPinsPath
    {
        get => TrustPinsFilePath;
        set => TrustPinsFilePath = value;
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
        set
        {
            if (SetProperty(ref _actualVerifierChecksum, value))
            {
                OnPropertyChanged(nameof(VerifierSha256));
            }
        }
    }

    public string VerifierSha256 => ActualVerifierChecksum;

    public bool IsVerifying
    {
        get => _isVerifying;
        set
        {
            if (SetProperty(ref _isVerifying, value))
            {
                IsLoading = value;
            }
        }
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

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
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
        set
        {
            if (SetProperty(ref _currentReport, value))
            {
                OnPropertyChanged(nameof(Report));
            }
        }
    }

    public AuditReport? Report => CurrentReport;

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

    public AuditExplorerViewModel(IVerifierRunner verifierRunner, ITrustPinStore trustPinStore)
        : this(verifierRunner, new ReportExporter())
    {
        _trustPinStore = trustPinStore;
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

        // If verifier script path is blank, check common repository paths or default python CLI
        var scriptPath = VerifierScriptPath;
        if (string.IsNullOrWhiteSpace(scriptPath))
        {
            var candidates = new[]
            {
                "/home/Kali/Desktop/HPTU/Team-Rocket/verifier/verify.py",
                Path.Combine(AppContext.BaseDirectory, "verifier", "verify.py"),
                Path.Combine(AppContext.BaseDirectory, "verify.py"),
                "/usr/local/bin/himvote_verifier"
            };

            foreach (var cand in candidates)
            {
                if (File.Exists(cand))
                {
                    scriptPath = cand;
                    VerifierScriptPath = cand;
                    break;
                }
            }

            if (string.IsNullOrWhiteSpace(scriptPath))
            {
                ErrorMessage = "Verifier path is required.";
                return;
            }
        }

        try
        {
            IsVerifying = true;
            VerificationCompleted = false;
            ErrorMessage = null;
            StatusMessage = "Computing verifier checksum and launching sandboxed process...";

            var options = new VerifierExecutionOptions
            {
                VerifierPath = scriptPath,
                ExpectedSha256Checksum = ExpectedVerifierChecksum,
                ExportDirectory = EvidenceDirectoryPath,
                TrustPinsFilePath = TrustPinsFilePath
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
