using CommunityToolkit.Mvvm.Input;
using HimVote.Core.Models;
using HimVote.Core.Services;

namespace HimVote.Core.ViewModels;

public class ReceiptViewModel : ViewModelBase
{
    private readonly IApiClient _apiClient;
    private string _electionId = string.Empty;
    private string _receiptHandle = string.Empty;
    private string _status = string.Empty;
    private long? _leafIndex;
    private DateTimeOffset? _witnessedAtUtc;
    private bool _isBusy;
    private bool _isFound;
    private ReceiptStatusResponse? _receipt;

    public string ElectionId
    {
        get => _electionId;
        set => SetProperty(ref _electionId, value);
    }

    public string ReceiptHandle
    {
        get => _receiptHandle;
        set
        {
            if (SetProperty(ref _receiptHandle, value))
            {
                OnPropertyChanged(nameof(Handle));
            }
        }
    }

    // Alias for XAML bindings
    public string Handle
    {
        get => ReceiptHandle;
        set => ReceiptHandle = value;
    }

    public string Status
    {
        get => _status;
        set => SetProperty(ref _status, value);
    }

    public long? LeafIndex
    {
        get => _leafIndex;
        set => SetProperty(ref _leafIndex, value);
    }

    public DateTimeOffset? WitnessedAtUtc
    {
        get => _witnessedAtUtc;
        set => SetProperty(ref _witnessedAtUtc, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        set
        {
            if (SetProperty(ref _isBusy, value))
            {
                IsLoading = value;
            }
        }
    }

    public bool IsFound
    {
        get => _isFound;
        set => SetProperty(ref _isFound, value);
    }

    public ReceiptStatusResponse? Receipt
    {
        get => _receipt;
        set => SetProperty(ref _receipt, value);
    }

    public IAsyncRelayCommand TrackReceiptCommand { get; }
    public IAsyncRelayCommand CheckReceiptStatusCommand => TrackReceiptCommand;
    public IRelayCommand ResetCommand { get; }

    public ReceiptViewModel(IApiClient apiClient)
    {
        _apiClient = apiClient;
        TrackReceiptCommand = new AsyncRelayCommand(TrackReceiptAsync, () => !IsBusy);
        ResetCommand = new RelayCommand(Reset);
    }

    public async Task TrackReceiptAsync()
    {
        var targetElectionId = string.IsNullOrWhiteSpace(ElectionId) ? "active_election" : ElectionId.Trim();
        var targetHandle = ReceiptHandle.Trim();

        if (string.IsNullOrWhiteSpace(targetHandle))
        {
            ErrorMessage = "Receipt Handle is required to verify inclusion.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            IsFound = false;

            var result = await _apiClient.GetReceiptStatusAsync(targetElectionId, targetHandle);
            Receipt = result;
            Status = result.Status;
            LeafIndex = result.LeafIndex;
            WitnessedAtUtc = result.WitnessedAtUtc;
            IsFound = true;
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
            Status = ReceiptStatuses.Rejected;
            IsFound = false;
            Receipt = null;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public void Reset()
    {
        ElectionId = string.Empty;
        ReceiptHandle = string.Empty;
        Status = string.Empty;
        LeafIndex = null;
        WitnessedAtUtc = null;
        ErrorMessage = null;
        IsFound = false;
        Receipt = null;
    }
}
