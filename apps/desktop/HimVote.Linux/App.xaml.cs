using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using HimVote.Core.ViewModels;
using HimVote.Linux.Services;
using HimVote.Linux.ViewModels;
using HimVote.Linux.Views;

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
            var apiClient = new ApiClient("http://localhost:8080");
            var secureStore = new LinuxSecureStore();
            var trustPinStore = new TrustPinStore();
            var verifierRunner = new VerifierRunner();
            var reportExporter = new ReportExporter();
            var evidenceImporter = new EvidenceImporter();
            var updateService = new UpdateService();

            var loginVm = new LoginViewModel(apiClient, secureStore);
            var electionsVm = new ElectionsViewModel(apiClient);
            var candidatesVm = new CandidatesViewModel(apiClient);
            var receiptVm = new ReceiptViewModel(apiClient);
            var evidenceImportVm = new EvidenceImportViewModel(evidenceImporter, trustPinStore);
            var auditExplorerVm = new AuditExplorerViewModel(verifierRunner, reportExporter);
            var adminVm = new AdminViewModel(apiClient);
            var settingsVm = new SettingsViewModel(updateService, secureStore, apiClient);

            var mainVm = new MainWindowViewModel(
                loginVm,
                electionsVm,
                candidatesVm,
                receiptVm,
                evidenceImportVm,
                auditExplorerVm,
                adminVm,
                settingsVm);

            desktop.MainWindow = new MainWindow
            {
                DataContext = mainVm
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}
