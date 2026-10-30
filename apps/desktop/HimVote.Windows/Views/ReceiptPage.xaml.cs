using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows.Views;

public sealed partial class ReceiptPage : Page
{
    public ReceiptViewModel? ViewModel { get; set; }

    public ReceiptPage()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public ReceiptPage(ReceiptViewModel viewModel) : this()
    {
        ViewModel = viewModel;
        DataContext = viewModel;
    }
}
