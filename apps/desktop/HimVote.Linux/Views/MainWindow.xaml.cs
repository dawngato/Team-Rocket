using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace HimVote.Linux.Views;

public partial class MainWindow : Window
{
    public MainWindow()
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
