using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace HimVote.Linux.Views;

public partial class EvidenceImportPage : UserControl
{
    public EvidenceImportPage()
    {
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        if (Application.Current != null)
        {
            AvaloniaXamlLoader.Load(this);
        }
    }
}
