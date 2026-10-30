using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace HimVote.Linux.Views;

public partial class LoginPage : UserControl
{
    public LoginPage()
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
