using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class LoginPage : Page
{
    public LoginViewModel? ViewModel { get; set; }

    public LoginPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public LoginPage(LoginViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
