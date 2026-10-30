using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HimVote.Core.ViewModels;

namespace HimVote.Linux.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    [ObservableProperty]
    private object _currentViewModel;

    [ObservableProperty]
    private string _currentPage = "login";

    public LoginViewModel LoginVm { get; }
    public ElectionsViewModel ElectionsVm { get; }
    public CandidatesViewModel CandidatesVm { get; }
    public ReceiptViewModel ReceiptVm { get; }
    public EvidenceImportViewModel EvidenceImportVm { get; }
    public AuditExplorerViewModel AuditExplorerVm { get; }
    public AdminViewModel AdminVm { get; }
    public SettingsViewModel SettingsVm { get; }

    public MainWindowViewModel(
        LoginViewModel loginVm,
        ElectionsViewModel electionsVm,
        CandidatesViewModel candidatesVm,
        ReceiptViewModel receiptVm,
        EvidenceImportViewModel evidenceImportVm,
        AuditExplorerViewModel auditExplorerVm,
        AdminViewModel adminVm,
        SettingsViewModel settingsVm)
    {
        LoginVm = loginVm;
        ElectionsVm = electionsVm;
        CandidatesVm = candidatesVm;
        ReceiptVm = receiptVm;
        EvidenceImportVm = evidenceImportVm;
        AuditExplorerVm = auditExplorerVm;
        AdminVm = adminVm;
        SettingsVm = settingsVm;

        _currentViewModel = loginVm;
        Title = "Sign in | HimVote";
    }

    [RelayCommand]
    public void NavigateTo(string page)
    {
        CurrentPage = page;
        CurrentViewModel = page switch
        {
            "elections" => ElectionsVm,
            "candidates" => CandidatesVm,
            "receipt" => ReceiptVm,
            "evidence" => EvidenceImportVm,
            "audit" => AuditExplorerVm,
            "admin" => AdminVm,
            "settings" => SettingsVm,
            _ => LoginVm
        };

        Title = page switch
        {
            "elections" => "Elections | HimVote",
            "candidates" => "Candidate Nominations | HimVote",
            "receipt" => "Receipt Verification | HimVote",
            "evidence" => "Offline Evidence Import | HimVote",
            "audit" => "Offline Audit Explorer | HimVote",
            "admin" => "Administrative Console | HimVote",
            "settings" => "System Settings | HimVote",
            _ => "Sign in | HimVote"
        };
    }
}
