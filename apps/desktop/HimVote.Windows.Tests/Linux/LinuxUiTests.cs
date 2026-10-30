using HimVote.Core.Services;
using HimVote.Core.ViewModels;
using HimVote.Linux;
using HimVote.Linux.Converters;
using HimVote.Linux.Services;
using HimVote.Linux.ViewModels;
using HimVote.Linux.Views;
using Moq;
using Xunit;

namespace HimVote.Windows.Tests.Linux;

public class LinuxUiTests
{
    [Fact]
    public void ViewLocator_ResolvesCorrectPageTypes()
    {
        var locator = new ViewLocator();

        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();
        var auditVm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object);

        var auditPage = locator.Build(auditVm);
        Assert.NotNull(auditPage);
        Assert.IsType<AuditExplorerPage>(auditPage);

        var mockImporter = new Mock<IEvidenceImporter>();
        var mockPins = new Mock<ITrustPinStore>();
        var evidenceVm = new EvidenceImportViewModel(mockImporter.Object, mockPins.Object);

        var evidencePage = locator.Build(evidenceVm);
        Assert.NotNull(evidencePage);
        Assert.IsType<EvidenceImportPage>(evidencePage);

        var mockApi = new Mock<IApiClient>();
        var receiptVm = new ReceiptViewModel(mockApi.Object);

        var receiptPage = locator.Build(receiptVm);
        Assert.NotNull(receiptPage);
        Assert.IsType<ReceiptPage>(receiptPage);

        var candidatesVm = new CandidatesViewModel(mockApi.Object);
        var candidatesPage = locator.Build(candidatesVm);
        Assert.NotNull(candidatesPage);
        Assert.IsType<CandidatesPage>(candidatesPage);

        var electionsVm = new ElectionsViewModel(mockApi.Object);
        var electionsPage = locator.Build(electionsVm);
        Assert.NotNull(electionsPage);
        Assert.IsType<ElectionsPage>(electionsPage);
    }

    [Fact]
    public void ObjectToBoolConverter_ConvertsCorrectly()
    {
        var isNotNullConv = ObjectToBoolConverter.IsNotNull;
        var isNullConv = ObjectToBoolConverter.IsNull;

        Assert.Equal(true, isNotNullConv.Convert("test", typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture));
        Assert.Equal(false, isNotNullConv.Convert(null, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture));

        Assert.Equal(false, isNullConv.Convert("test", typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture));
        Assert.Equal(true, isNullConv.Convert(null, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public void BoolToStringConverter_ConvertsWithParameter()
    {
        var conv = BoolToStringConverter.TrueFalse;

        var resultTrue = conv.Convert(true, typeof(string), "PassText|FailText", System.Globalization.CultureInfo.InvariantCulture);
        var resultFalse = conv.Convert(false, typeof(string), "PassText|FailText", System.Globalization.CultureInfo.InvariantCulture);

        Assert.Equal("PassText", resultTrue);
        Assert.Equal("FailText", resultFalse);
    }

    [Fact]
    public void MainWindowViewModel_Navigation_UpdatesCurrentViewModelAndTitle()
    {
        var mockApi = new Mock<IApiClient>();
        var mockSecure = new Mock<ISecureStore>();
        var mockImporter = new Mock<IEvidenceImporter>();
        var mockPins = new Mock<ITrustPinStore>();
        var mockRunner = new Mock<IVerifierRunner>();
        var mockExporter = new Mock<IReportExporter>();
        var mockUpdate = new Mock<IUpdateService>();

        var loginVm = new LoginViewModel(mockApi.Object, mockSecure.Object);
        var electionsVm = new ElectionsViewModel(mockApi.Object);
        var candidatesVm = new CandidatesViewModel(mockApi.Object);
        var receiptVm = new ReceiptViewModel(mockApi.Object);
        var evidenceVm = new EvidenceImportViewModel(mockImporter.Object, mockPins.Object);
        var auditVm = new AuditExplorerViewModel(mockRunner.Object, mockExporter.Object);
        var adminVm = new AdminViewModel(mockApi.Object);
        var settingsVm = new SettingsViewModel(mockUpdate.Object, mockSecure.Object, mockApi.Object);

        var mainVm = new MainWindowViewModel(
            loginVm,
            electionsVm,
            candidatesVm,
            receiptVm,
            evidenceVm,
            auditVm,
            adminVm,
            settingsVm);

        Assert.Equal(loginVm, mainVm.CurrentViewModel);

        mainVm.NavigateTo("elections");
        Assert.Equal(electionsVm, mainVm.CurrentViewModel);
        Assert.Contains("Elections", mainVm.Title);

        mainVm.NavigateTo("candidates");
        Assert.Equal(candidatesVm, mainVm.CurrentViewModel);
        Assert.Contains("Candidate", mainVm.Title);

        mainVm.NavigateTo("receipt");
        Assert.Equal(receiptVm, mainVm.CurrentViewModel);
        Assert.Contains("Receipt", mainVm.Title);

        mainVm.NavigateTo("evidence");
        Assert.Equal(evidenceVm, mainVm.CurrentViewModel);
        Assert.Contains("Evidence", mainVm.Title);

        mainVm.NavigateTo("audit");
        Assert.Equal(auditVm, mainVm.CurrentViewModel);
        Assert.Contains("Audit", mainVm.Title);

        mainVm.NavigateTo("admin");
        Assert.Equal(adminVm, mainVm.CurrentViewModel);
        Assert.Contains("Admin", mainVm.Title);

        mainVm.NavigateTo("settings");
        Assert.Equal(settingsVm, mainVm.CurrentViewModel);
        Assert.Contains("Settings", mainVm.Title);
    }
}
