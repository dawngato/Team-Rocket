using CommunityToolkit.Mvvm.ComponentModel;

namespace HimVote.Core.ViewModels;

public abstract class ViewModelBase : ObservableObject
{
    private string _title = string.Empty;
    private bool _isLoading;
    private bool _hasError;
    private string? _errorMessage;

    public string Title
    {
        get => _title;
        set => SetProperty(ref _title, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public bool HasError
    {
        get => _hasError;
        set => SetProperty(ref _hasError, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        set
        {
            if (SetProperty(ref _errorMessage, value))
            {
                HasError = !string.IsNullOrEmpty(value);
            }
        }
    }
}
