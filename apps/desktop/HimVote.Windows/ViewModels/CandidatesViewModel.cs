using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Windows.Models;
using HimVote.Windows.Services;

namespace HimVote.Windows.ViewModels;

public class CandidatesViewModel : ObservableObject
{
    private readonly IApiClient _apiClient;
    private string _electionId = string.Empty;
    private string _electionTitle = string.Empty;
    private bool _isBusy;
    private string? _errorMessage;

    public ObservableCollection<Candidate> Candidates { get; } = new();

    public string ElectionId
    {
        get => _electionId;
        set => SetProperty(ref _electionId, value);
    }

    public string ElectionTitle
    {
        get => _electionTitle;
        set => SetProperty(ref _electionTitle, value);
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

    public IAsyncRelayCommand<string> LoadCandidatesCommand { get; }

    public CandidatesViewModel(IApiClient apiClient)
    {
        _apiClient = apiClient;
        LoadCandidatesCommand = new AsyncRelayCommand<string>(LoadCandidatesAsync);
    }

    public async Task LoadCandidatesAsync(string? electionId)
    {
        var targetId = electionId ?? ElectionId;
        if (string.IsNullOrWhiteSpace(targetId))
        {
            ErrorMessage = "Election ID is required to load candidates.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var election = await _apiClient.GetElectionByIdAsync(targetId);
            ElectionId = election.Id;
            ElectionTitle = election.Title;

            Candidates.Clear();
            foreach (var candidate in election.Candidates)
            {
                Candidates.Add(candidate);
            }
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
}
