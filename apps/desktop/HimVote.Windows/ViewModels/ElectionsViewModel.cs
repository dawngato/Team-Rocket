using System.Collections.ObjectModel;
using System.Diagnostics;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Windows.Models;
using HimVote.Windows.Services;

namespace HimVote.Windows.ViewModels;

public class ElectionsViewModel : ObservableObject
{
    private readonly IApiClient _apiClient;
    private bool _isBusy;
    private string? _errorMessage;
    private string? _statusMessage;
    private ElectionSummary? _selectedElection;
    private string _filterState = "ALL";

    public ObservableCollection<ElectionSummary> AllElections { get; } = new();
    public ObservableCollection<ElectionSummary> FilteredElections { get; } = new();

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

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public ElectionSummary? SelectedElection
    {
        get => _selectedElection;
        set => SetProperty(ref _selectedElection, value);
    }

    public string FilterState
    {
        get => _filterState;
        set
        {
            if (SetProperty(ref _filterState, value))
            {
                ApplyFilter();
            }
        }
    }

    public IAsyncRelayCommand LoadElectionsCommand { get; }
    public IRelayCommand<ElectionSummary> OpenBoothCommand { get; }

    public ElectionsViewModel(IApiClient apiClient)
    {
        _apiClient = apiClient;
        LoadElectionsCommand = new AsyncRelayCommand(LoadElectionsAsync, () => !IsBusy);
        OpenBoothCommand = new RelayCommand<ElectionSummary>(OpenBooth);
    }

    public async Task LoadElectionsAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = "Fetching institutional elections...";

            var list = await _apiClient.GetElectionsAsync();
            AllElections.Clear();
            foreach (var item in list)
            {
                AllElections.Add(item);
            }

            ApplyFilter();
            StatusMessage = $"Loaded {AllElections.Count} elections.";
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

    private void ApplyFilter()
    {
        FilteredElections.Clear();
        var normalizedFilter = FilterState.ToUpperInvariant();

        foreach (var election in AllElections)
        {
            if (normalizedFilter == "ALL" ||
                string.Equals(election.State, normalizedFilter, StringComparison.OrdinalIgnoreCase))
            {
                FilteredElections.Add(election);
            }
        }
    }

    public void OpenBooth(ElectionSummary? election)
    {
        var target = election ?? SelectedElection;
        if (target == null)
        {
            ErrorMessage = "Select an election first to launch the ballot booth.";
            return;
        }

        var boothUrl = $"{_apiClient.BaseUrl}/booth?election_id={Uri.EscapeDataString(target.Id)}&callback=himvote://booth_callback";

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = boothUrl,
                UseShellExecute = true
            });
            StatusMessage = $"Launched booth for {target.Title} in default web browser.";
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Unable to launch system browser: {ex.Message}";
        }
    }
}
