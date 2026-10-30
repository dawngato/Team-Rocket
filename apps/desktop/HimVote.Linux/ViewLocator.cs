using Avalonia.Controls;
using Avalonia.Controls.Templates;
using CommunityToolkit.Mvvm.ComponentModel;
using HimVote.Core.ViewModels;
using HimVote.Linux.Views;

namespace HimVote.Linux;

public class ViewLocator : IDataTemplate
{
    public Control? Build(object? data)
    {
        if (data is null)
        {
            return null;
        }

        return data switch
        {
            AuditExplorerViewModel => new AuditExplorerPage(),
            EvidenceImportViewModel => new EvidenceImportPage(),
            ReceiptViewModel => new ReceiptPage(),
            CandidatesViewModel => new CandidatesPage(),
            ElectionsViewModel => new ElectionsPage(),
            AdminViewModel => new AdminPage(),
            LoginViewModel => new LoginPage(),
            SettingsViewModel => new SettingsPage(),
            _ => new TextBlock { Text = $"View not mapped for {data.GetType().Name}" }
        };
    }

    public bool Match(object? data)
    {
        return data is ObservableObject;
    }
}
