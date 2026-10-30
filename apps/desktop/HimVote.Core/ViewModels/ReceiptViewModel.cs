using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Core.Models;
using HimVote.Core.Services;

namespace HimVote.Core.ViewModels;

public class ReceiptViewModel : ObservableObject
{
    private readonly IApiClient _apiClient;
    private string _electionId = string.Empty;
    private string _receiptHandle = string.Empty;
    private string _status = string.Empty;
    private long? _leafIndex;
    private DateTimeOffset? _witnessedAtUtc;
    private bool _isBusy;
    private string? _errorMessage;
    private bool _isFound;

    public string ElectionId
    {
        get => _electionId;
        set => SetProperty(ref _electionId, value);
    }

    public string ReceiptHandle
    {
        get => _receiptHandle;
        set => SetProperty(ref _receiptHandle, value);
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
        set => SetProperty(ref _isBusy, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public bool IsFound
    {
        get => _isFound;
        set => SetProperty(ref _isFound, value);
    }

    public IAsyncRelayCommand TrackReceiptCommand { get; }
    public IRelayCommand ResetCommand { get; }

    public ReceiptViewModel(IApiClient apiClient)
    {
        _apiClient = apiClient;
        TrackReceiptCommand = new AsyncRelayCommand(TrackReceiptAsync, () => !IsBusy);
        ResetCommand = new RelayCommand(Reset);
    }

    public async Task TrackReceiptAsync()
    {
        if (string.IsNullOrWhiteSpace(ElectionId) || string.IsNullOrWhiteSpace(ReceiptHandle))
        {
            ErrorMessage = "Both Election ID and Receipt Handle are required to verify inclusion.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            IsFound = false;

            var result = await _apiClient.GetReceiptStatusAsync(ElectionId.Trim(), ReceiptHandle.Trim());
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
    }
}
