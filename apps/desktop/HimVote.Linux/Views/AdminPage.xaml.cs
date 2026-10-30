using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace HimVote.Linux.Views;

public partial class AdminPage : UserControl
{
    public AdminPage()
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
