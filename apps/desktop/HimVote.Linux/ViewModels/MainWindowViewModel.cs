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

    public MainWindowViewModel(
        LoginViewModel loginVm,
        ElectionsViewModel electionsVm,
        AdminViewModel adminVm,
        AuditExplorerViewModel auditExplorerVm)
    {
        LoginVm = loginVm;
        ElectionsVm = electionsVm;
        AdminVm = adminVm;
        AuditExplorerVm = auditExplorerVm;
        CurrentViewModel = loginVm;
        Title = "HimVote";
    }

    public LoginViewModel LoginVm { get; }
    public ElectionsViewModel ElectionsVm { get; }
    public AdminViewModel AdminVm { get; }
    public AuditExplorerViewModel AuditExplorerVm { get; }

    [RelayCommand]
    public void NavigateTo(string page)
    {
        CurrentPage = page;
        CurrentViewModel = page switch
        {
            "elections" => ElectionsVm,
            "admin" => AdminVm,
            "audit" => AuditExplorerVm,
            _ => LoginVm
        };
        Title = page switch
        {
            "elections" => "My Elections - HimVote",
            "admin" => "Administrative Console - HimVote",
            "audit" => "Offline Audit Explorer - HimVote",
            _ => "Sign in - HimVote"
        };
    }
}