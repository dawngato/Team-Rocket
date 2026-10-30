using HimVote.Windows.Models;

namespace HimVote.Windows.Services;

public interface IReportExporter
{
    string ExportToJson(AuditReport report);
    string ExportToText(AuditReport report);
    Task ExportToJsonFileAsync(AuditReport report, string filePath, CancellationToken cancellationToken = default);
    Task ExportToTextFileAsync(AuditReport report, string filePath, CancellationToken cancellationToken = default);
}
