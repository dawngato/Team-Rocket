using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class AdminPage : Page
{
    public AdminViewModel? ViewModel { get; set; }

    public AdminPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public AdminPage(AdminViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
