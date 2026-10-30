using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class ElectionsPage : Page
{
    public ElectionsViewModel? ViewModel { get; set; }

    public ElectionsPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public ElectionsPage(ElectionsViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
