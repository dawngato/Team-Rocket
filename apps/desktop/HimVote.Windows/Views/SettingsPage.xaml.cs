using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class SettingsPage : Page
{
    public SettingsViewModel? ViewModel { get; set; }

    public SettingsPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public SettingsPage(SettingsViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
