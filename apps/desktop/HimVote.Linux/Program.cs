using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using HimVote.Linux.Services;
using HimVote.Linux.ViewModels;
using HimVote.Core.Services;
using HimVote.Core.ViewModels;

namespace HimVote.Linux;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // Register services
            var apiClient = new ApiClient("http://localhost:8080");
            var secureStore = new LinuxSecureStore();
            var trustPinStore = new TrustPinStore();
            var verifierRunner = new VerifierRunner("/usr/local/bin/himvote-verifier", "placeholder-sha256");
            var reportExporter = new ReportExporter();
            var evidenceImporter = new EvidenceImporter();
            var updateService = new UpdateService();

            // Register view models
            var loginVm = new LoginViewModel(apiClient, secureStore);
            var electionsVm = new ElectionsViewModel(apiClient);
            var adminVm = new AdminViewModel(apiClient);
            var auditExplorerVm = new AuditExplorerViewModel(verifierRunner, trustPinStore);

            desktop.MainWindow = new MainWindow
            {
                DataContext = new MainWindowViewModel(loginVm, electionsVm, adminVm, auditExplorerVm)
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}