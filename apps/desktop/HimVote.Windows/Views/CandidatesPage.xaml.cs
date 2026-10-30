using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class CandidatesPage : Page
{
    public CandidatesViewModel? ViewModel { get; set; }

    public CandidatesPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public CandidatesPage(CandidatesViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
