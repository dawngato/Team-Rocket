using CommunityToolkit.Mvvm.Input;
using HimVote.Core.Models;
using HimVote.Core.Services;

namespace HimVote.Core.ViewModels;

public class LoginViewModel : ViewModelBase
{
    private readonly IApiClient _apiClient;
    private readonly ISecureStore _secureStore;

    private string _email = string.Empty;
    private string _password = string.Empty;
    private string _mfaToken = string.Empty;
    private bool _isBusy;
    private string? _statusMessage;
    private UserSession? _currentUser;

    public string Email
    {
        get => _email;
        set => SetProperty(ref _email, value);
    }

    public string Password
    {
        get => _password;
        set => SetProperty(ref _password, value);
    }

    public string MfaToken
    {
        get => _mfaToken;
        set => SetProperty(ref _mfaToken, value);
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

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public UserSession? CurrentUser
    {
        get => _currentUser;
        private set
        {
            if (SetProperty(ref _currentUser, value))
            {
                OnPropertyChanged(nameof(IsLoggedIn));
                OnPropertyChanged(nameof(IsAdministrator));
                OnPropertyChanged(nameof(IsElectionOfficer));
            }
        }
    }

    public bool IsLoggedIn => CurrentUser != null && CurrentUser.IsAuthenticated;
    public bool IsAdministrator => CurrentUser?.Role == UserRole.Administrator;
    public bool IsElectionOfficer => CurrentUser?.Role == UserRole.ElectionOfficer || IsAdministrator;

    public IAsyncRelayCommand LoginCommand { get; }
    public IAsyncRelayCommand LogoutCommand { get; }
    public IAsyncRelayCommand RestoreSavedSessionCommand { get; }

    public LoginViewModel(IApiClient apiClient, ISecureStore secureStore)
    {
        _apiClient = apiClient;
        _secureStore = secureStore;

        LoginCommand = new AsyncRelayCommand(LoginAsync, () => !IsBusy);
        LogoutCommand = new AsyncRelayCommand(LogoutAsync, () => !IsBusy);
        RestoreSavedSessionCommand = new AsyncRelayCommand(RestoreSavedSessionAsync, () => !IsBusy);
    }

    public async Task LoginAsync()
    {
        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "Email and password are required.";
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            StatusMessage = "Authenticating with identity origin...";

            var session = await _apiClient.LoginAsync(Email, Password, string.IsNullOrWhiteSpace(MfaToken) ? null : MfaToken);
            CurrentUser = session;

            await _secureStore.SetSecretAsync("session_bearer_token", session.BearerToken);
            await _secureStore.SetSecretAsync("session_user_email", session.Email);
            await _secureStore.SetSecretAsync("session_user_role", session.Role.ToString());

            StatusMessage = $"Signed in successfully as {session.FullName}";
            Password = string.Empty;
            MfaToken = string.Empty;
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

    public async Task LogoutAsync()
    {
        try
        {
            IsBusy = true;
            await _apiClient.LogoutAsync();
            await _secureStore.RemoveSecretAsync("session_bearer_token");
            await _secureStore.RemoveSecretAsync("session_user_email");
            await _secureStore.RemoveSecretAsync("session_user_role");
            CurrentUser = null;
            StatusMessage = "Logged out.";
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

    public async Task RestoreSavedSessionAsync()
    {
        try
        {
            var savedToken = await _secureStore.GetSecretAsync("session_bearer_token");
            var savedEmail = await _secureStore.GetSecretAsync("session_user_email");
            var savedRoleStr = await _secureStore.GetSecretAsync("session_user_role");

            if (!string.IsNullOrWhiteSpace(savedToken) && !string.IsNullOrWhiteSpace(savedEmail))
            {
                var role = UserRole.Student;
                if (Enum.TryParse<UserRole>(savedRoleStr, out var parsedRole))
                {
                    role = parsedRole;
                }

                _apiClient.BearerToken = savedToken;
                CurrentUser = new UserSession
                {
                    Email = savedEmail,
                    FullName = savedEmail,
                    Role = role,
                    BearerToken = savedToken,
                    ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(2)
                };
                StatusMessage = "Restored previous session.";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }
}
