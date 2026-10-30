using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Windows.Models;
using HimVote.Windows.Services;

namespace HimVote.Windows.ViewModels;

public class EvidenceImportViewModel : ObservableObject
{
    private readonly IEvidenceImporter _evidenceImporter;
    private readonly ITrustPinStore _trustPinStore;

    private string _zipFilePath = string.Empty;
    private string _trustPinsFilePath = string.Empty;
    private string _destinationDirectory = string.Empty;
    private bool _isBusy;
    private string? _statusMessage;
    private string? _errorMessage;
    private int _extractedCount;
    private long _totalBytesExtracted;
    private bool _extractionCompleted;
    private bool _trustPinsLoaded;
    private TrustPins? _currentTrustPins;

    public ObservableCollection<string> ExtractedFiles { get; } = new();

    public string ZipFilePath
    {
        get => _zipFilePath;
        set
        {
            if (SetProperty(ref _zipFilePath, value))
            {
                OnPropertyChanged(nameof(CanExtract));
            }
        }
    }

    public string TrustPinsFilePath
    {
        get => _trustPinsFilePath;
        set
        {
            if (SetProperty(ref _trustPinsFilePath, value))
            {
                OnPropertyChanged(nameof(CanImportTrustPins));
            }
        }
    }

    public string DestinationDirectory
    {
        get => _destinationDirectory;
        set => SetProperty(ref _destinationDirectory, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        set
        {
            if (SetProperty(ref _isBusy, value))
            {
                OnPropertyChanged(nameof(CanExtract));
                OnPropertyChanged(nameof(CanImportTrustPins));
            }
        }
    }

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public int ExtractedCount
    {
        get => _extractedCount;
        set => SetProperty(ref _extractedCount, value);
    }

    public long TotalBytesExtracted
    {
        get => _totalBytesExtracted;
        set => SetProperty(ref _totalBytesExtracted, value);
    }

    public bool ExtractionCompleted
    {
        get => _extractionCompleted;
        set
        {
            if (SetProperty(ref _extractionCompleted, value))
            {
                OnPropertyChanged(nameof(IsReadyForAudit));
            }
        }
    }

    public bool TrustPinsLoaded
    {
        get => _trustPinsLoaded;
        set
        {
            if (SetProperty(ref _trustPinsLoaded, value))
            {
                OnPropertyChanged(nameof(IsReadyForAudit));
            }
        }
    }

    public TrustPins? CurrentTrustPins
    {
        get => _currentTrustPins;
        private set => SetProperty(ref _currentTrustPins, value);
    }

    public bool CanExtract => !IsBusy && !string.IsNullOrWhiteSpace(ZipFilePath);
    public bool CanImportTrustPins => !IsBusy && !string.IsNullOrWhiteSpace(TrustPinsFilePath);
    public bool IsReadyForAudit => ExtractionCompleted && TrustPinsLoaded;

    public IAsyncRelayCommand ExtractArchiveCommand { get; }
    public IAsyncRelayCommand ImportTrustPinsCommand { get; }
    public IRelayCommand ResetCommand { get; }

    public EvidenceImportViewModel(IEvidenceImporter evidenceImporter, ITrustPinStore trustPinStore)
    {
        _evidenceImporter = evidenceImporter;
        _trustPinStore = trustPinStore;

        var defaultExportDir = Path.Combine(Path.GetTempPath(), "HimVoteEvidence", Guid.NewGuid().ToString("N"));
        _destinationDirectory = defaultExportDir;

        ExtractArchiveCommand = new AsyncRelayCommand(ExtractArchiveAsync, () => CanExtract);
        ImportTrustPinsCommand = new AsyncRelayCommand(ImportTrustPinsAsync, () => CanImportTrustPins);
        ResetCommand = new RelayCommand(Reset);
    }

    public async Task ExtractArchiveAsync()
    {
        if (string.IsNullOrWhiteSpace(ZipFilePath))
        {
            ErrorMessage = "Select an evidence archive ZIP file first.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = "Extracting evidence archive with strict safety checks...";
            ExtractedFiles.Clear();
            ExtractionCompleted = false;
            TrustPinsLoaded = false;
            CurrentTrustPins = null;

            if (string.IsNullOrWhiteSpace(DestinationDirectory))
            {
                DestinationDirectory = Path.Combine(Path.GetTempPath(), "HimVoteEvidence", Guid.NewGuid().ToString("N"));
            }

            var result = await _evidenceImporter.ExtractArchiveAsync(ZipFilePath, DestinationDirectory);

            if (!result.Success)
            {
                ErrorMessage = $"Extraction failed: {result.ErrorMessage}";
                StatusMessage = null;
                return;
            }

            ExtractedCount = result.FileCount;
            TotalBytesExtracted = result.TotalBytesExtracted;
            foreach (var file in result.ExtractedFiles)
            {
                ExtractedFiles.Add(file);
            }

            ExtractionCompleted = true;
            StatusMessage = $"Safely extracted {result.FileCount} files ({result.TotalBytesExtracted:N0} bytes) to {result.DestinationDirectory}.";
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
            StatusMessage = null;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task ImportTrustPinsAsync()
    {
        if (string.IsNullOrWhiteSpace(TrustPinsFilePath))
        {
            ErrorMessage = "Select a separate trust pins file chosen from your system.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = "Validating and importing external trust pins...";

            var pins = await _trustPinStore.ImportFromFileAsync(TrustPinsFilePath, DestinationDirectory);
            CurrentTrustPins = pins;
            TrustPinsLoaded = true;
            StatusMessage = $"Trust pins loaded successfully. Manifest digest: {pins.ManifestDigest}";
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
            TrustPinsLoaded = false;
            CurrentTrustPins = null;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public void Reset()
    {
        ZipFilePath = string.Empty;
        TrustPinsFilePath = string.Empty;
        StatusMessage = null;
        ErrorMessage = null;
        ExtractedFiles.Clear();
        ExtractedCount = 0;
        TotalBytesExtracted = 0;
        ExtractionCompleted = false;
        TrustPinsLoaded = false;
        CurrentTrustPins = null;
    }
}
