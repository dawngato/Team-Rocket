using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using HimVote.Windows.Views;
using HimVote.Windows.ViewModels;

namespace HimVote.Windows;

public sealed partial class MainWindow : Window
{
    private readonly App? _app;

    public MainWindow()
    {
#if WINDOWS
        this.InitializeComponent();
#endif
    }

    public MainWindow(App app) : this()
    {
        _app = app;
    }

    public void NavigateTo(string tag)
    {
        if (_app == null) return;

        switch (tag)
        {
            case "Login":
                Content = new LoginPage(new LoginViewModel(_app.ApiClient, _app.SecureStore));
                break;
            case "Elections":
                Content = new ElectionsPage(new ElectionsViewModel(_app.ApiClient));
                break;
            case "Receipt":
                Content = new ReceiptPage(new ReceiptViewModel(_app.ApiClient));
                break;
            case "Admin":
                Content = new AdminPage(new AdminViewModel(_app.ApiClient));
                break;
            case "EvidenceImport":
                Content = new EvidenceImportPage(new EvidenceImportViewModel(_app.EvidenceImporter, _app.TrustPinStore));
                break;
            case "AuditExplorer":
                Content = new AuditExplorerPage(new AuditExplorerViewModel(_app.VerifierRunner, _app.ReportExporter));
                break;
            case "Settings":
                Content = new SettingsPage(new SettingsViewModel(_app.UpdateService, _app.SecureStore, _app.ApiClient));
                break;
        }
    }
}
