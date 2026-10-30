using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class EvidenceImportPage : Page
{
    public EvidenceImportViewModel? ViewModel { get; set; }

    public EvidenceImportPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public EvidenceImportPage(EvidenceImportViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
