using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class AuditExplorerPage : Page
{
    public AuditExplorerViewModel? ViewModel { get; set; }

    public AuditExplorerPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public AuditExplorerPage(AuditExplorerViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
