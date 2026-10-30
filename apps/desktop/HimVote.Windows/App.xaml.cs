using Microsoft.UI.Xaml;
using HimVote.Windows.Services;

namespace HimVote.Windows;

public partial class App : Application
{
    private Window? _mainWindow;

    public Window? MainWindow
    {
        get => _mainWindow;
        set => _mainWindow = value;
    }

    public IApiClient ApiClient { get; }
    public ISecureStore SecureStore { get; }
    public IEvidenceImporter EvidenceImporter { get; }
    public ITrustPinStore TrustPinStore { get; }
    public IVerifierRunner VerifierRunner { get; }
    public IReportExporter ReportExporter { get; }
    public IUpdateService UpdateService { get; }

    public App()
    {
        ApiClient = new ApiClient();
        SecureStore = new SecureStore();
        EvidenceImporter = new EvidenceImporter();
        TrustPinStore = new TrustPinStore();
        VerifierRunner = new VerifierRunner();
        ReportExporter = new ReportExporter();
        UpdateService = new UpdateService();

#if WINDOWS
        this.InitializeComponent();
#endif
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        _mainWindow = new MainWindow(this);
        _mainWindow.Activate();
    }
}
