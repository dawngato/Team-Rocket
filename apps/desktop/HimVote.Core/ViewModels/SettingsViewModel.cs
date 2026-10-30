using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Core.Services;

namespace HimVote.Core.ViewModels;

public class SettingsViewModel : ObservableObject
{
    private readonly IUpdateService _updateService;
    private readonly ISecureStore _secureStore;
    private readonly IApiClient _apiClient;

    private string _apiBaseUrl = "http://localhost:8080";
    private string _appVersion = string.Empty;
    private string _verifierVersion = string.Empty;
    private string _verifierChecksum = string.Empty;
    private string _distributionChannel = string.Empty;
    private bool _isCheckingUpdate;
    private string? _statusMessage;
    private string? _errorMessage;

    public string ApiBaseUrl
    {
        get => _apiBaseUrl;
        set => SetProperty(ref _apiBaseUrl, value);
    }

    public string AppVersion
    {
        get => _appVersion;
        set => SetProperty(ref _appVersion, value);
    }

    public string VerifierVersion
    {
        get => _verifierVersion;
        set => SetProperty(ref _verifierVersion, value);
    }

    public string VerifierChecksum
    {
        get => _verifierChecksum;
        set => SetProperty(ref _verifierChecksum, value);
    }

    public string DistributionChannel
    {
        get => _distributionChannel;
        set => SetProperty(ref _distributionChannel, value);
    }

    public bool IsCheckingUpdate
    {
        get => _isCheckingUpdate;
        set => SetProperty(ref _isCheckingUpdate, value);
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

    public IAsyncRelayCommand CheckUpdatesCommand { get; }
    public IAsyncRelayCommand SaveSettingsCommand { get; }

    public SettingsViewModel(IUpdateService updateService, ISecureStore secureStore, IApiClient apiClient)
    {
        _updateService = updateService;
        _secureStore = secureStore;
        _apiClient = apiClient;

        AppVersion = _updateService.AppVersion;
        VerifierVersion = _updateService.VerifierVersion;
        DistributionChannel = _updateService.DistributionChannel;
        ApiBaseUrl = _apiClient.BaseUrl;

        CheckUpdatesCommand = new AsyncRelayCommand(CheckUpdatesAsync, () => !IsCheckingUpdate);
        SaveSettingsCommand = new AsyncRelayCommand(SaveSettingsAsync);
    }

    public async Task CheckUpdatesAsync()
    {
        try
        {
            IsCheckingUpdate = true;
            ErrorMessage = null;
            StatusMessage = "Checking for signed updates via Microsoft Store / Enterprise MSIX channel...";

            var updateInfo = await _updateService.CheckForUpdatesAsync();
            if (updateInfo.IsUpdateAvailable)
            {
                StatusMessage = $"Update available: version {updateInfo.LatestVersion}";
            }
            else
            {
                StatusMessage = $"Client is up to date (Version {updateInfo.CurrentVersion}).";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsCheckingUpdate = false;
        }
    }

    public async Task SaveSettingsAsync()
    {
        try
        {
            _apiClient.BaseUrl = ApiBaseUrl;
            await _secureStore.SetSecretAsync("setting_api_base_url", ApiBaseUrl);
            StatusMessage = "Settings saved successfully.";
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }
}
