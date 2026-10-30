using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Windows.Models;
using HimVote.Windows.Services;

namespace HimVote.Windows.ViewModels;

public class AdminViewModel : ObservableObject
{
    private readonly IApiClient _apiClient;

    private string _newElectionTitle = string.Empty;
    private string _contest = "President";
    private string _selectionRule = "single_choice";
    private DateTimeOffset _opensAtUtc = DateTimeOffset.UtcNow.AddDays(1);
    private DateTimeOffset _closesAtUtc = DateTimeOffset.UtcNow.AddDays(3);
    private DateTimeOffset _issuanceCutoffUtc = DateTimeOffset.UtcNow.AddDays(1);
    private int _minAnonymousTurnout = 10;

    private bool _isBusy;
    private string? _statusMessage;
    private string? _errorMessage;
    private ElectionSummary? _selectedElection;

    public ObservableCollection<ElectionSummary> ManagedElections { get; } = new();

    public string NewElectionTitle
    {
        get => _newElectionTitle;
        set => SetProperty(ref _newElectionTitle, value);
    }

    public string Contest
    {
        get => _contest;
        set => SetProperty(ref _contest, value);
    }

    public string SelectionRule
    {
        get => _selectionRule;
        set => SetProperty(ref _selectionRule, value);
    }

    public DateTimeOffset OpensAtUtc
    {
        get => _opensAtUtc;
        set => SetProperty(ref _opensAtUtc, value);
    }

    public DateTimeOffset ClosesAtUtc
    {
        get => _closesAtUtc;
        set => SetProperty(ref _closesAtUtc, value);
    }

    public DateTimeOffset IssuanceCutoffUtc
    {
        get => _issuanceCutoffUtc;
        set => SetProperty(ref _issuanceCutoffUtc, value);
    }

    public int MinAnonymousTurnout
    {
        get => _minAnonymousTurnout;
        set => SetProperty(ref _minAnonymousTurnout, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        set => SetProperty(ref _isBusy, value);
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

    public ElectionSummary? SelectedElection
    {
        get => _selectedElection;
        set => SetProperty(ref _selectedElection, value);
    }

    public IAsyncRelayCommand CreateElectionCommand { get; }
    public IAsyncRelayCommand<string> FreezeElectionCommand { get; }
    public IAsyncRelayCommand<string> OpenElectionCommand { get; }
    public IAsyncRelayCommand<string> CloseElectionCommand { get; }
    public IAsyncRelayCommand<string> RequestPublicationCommand { get; }
    public IAsyncRelayCommand RefreshElectionsCommand { get; }

    public AdminViewModel(IApiClient apiClient)
    {
        _apiClient = apiClient;

        CreateElectionCommand = new AsyncRelayCommand(CreateElectionAsync, () => !IsBusy);
        FreezeElectionCommand = new AsyncRelayCommand<string>(FreezeElectionAsync);
        OpenElectionCommand = new AsyncRelayCommand<string>(OpenElectionAsync);
        CloseElectionCommand = new AsyncRelayCommand<string>(CloseElectionAsync);
        RequestPublicationCommand = new AsyncRelayCommand<string>(RequestPublicationAsync);
        RefreshElectionsCommand = new AsyncRelayCommand(RefreshElectionsAsync, () => !IsBusy);
    }

    public async Task CreateElectionAsync()
    {
        if (string.IsNullOrWhiteSpace(NewElectionTitle))
        {
            ErrorMessage = "Election title is required.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = "Creating election draft on server...";

            var request = new CreateElectionRequest
            {
                Title = NewElectionTitle,
                Contest = Contest,
                SelectionRule = SelectionRule,
                OpensAtUtc = OpensAtUtc,
                ClosesAtUtc = ClosesAtUtc,
                IssuanceCutoffUtc = IssuanceCutoffUtc,
                MinAnonymousTurnout = MinAnonymousTurnout
            };

            var created = await _apiClient.CreateElectionAsync(request);
            StatusMessage = $"Created election draft: {created.Title} ({created.Id})";
            NewElectionTitle = string.Empty;

            await RefreshElectionsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task FreezeElectionAsync(string? electionId)
    {
        var targetId = electionId ?? SelectedElection?.Id;
        if (string.IsNullOrWhiteSpace(targetId)) return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = $"Freezing roster for election {targetId}...";

            var result = await _apiClient.FreezeElectionAsync(targetId);
            StatusMessage = $"Roster frozen for {result.Title}. State is now {result.State}.";
            await RefreshElectionsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task OpenElectionAsync(string? electionId)
    {
        var targetId = electionId ?? SelectedElection?.Id;
        if (string.IsNullOrWhiteSpace(targetId)) return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = $"Opening election {targetId} for casting...";

            var result = await _apiClient.OpenElectionAsync(targetId);
            StatusMessage = $"Election opened: {result.Title}. State is now {result.State}.";
            await RefreshElectionsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task CloseElectionAsync(string? electionId)
    {
        var targetId = electionId ?? SelectedElection?.Id;
        if (string.IsNullOrWhiteSpace(targetId)) return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = $"Closing election {targetId}...";

            var result = await _apiClient.CloseElectionAsync(targetId);
            StatusMessage = $"Election closed: {result.Title}. State is now {result.State}.";
            await RefreshElectionsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task RequestPublicationAsync(string? electionId)
    {
        var targetId = electionId ?? SelectedElection?.Id;
        if (string.IsNullOrWhiteSpace(targetId)) return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = $"Requesting results publication for election {targetId}...";

            await _apiClient.RequestPublicationAsync(targetId);
            StatusMessage = $"Publication request submitted successfully for {targetId}.";
            await RefreshElectionsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task RefreshElectionsAsync()
    {
        try
        {
            var list = await _apiClient.GetElectionsAsync();
            ManagedElections.Clear();
            foreach (var item in list)
            {
                ManagedElections.Add(item);
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }
}
