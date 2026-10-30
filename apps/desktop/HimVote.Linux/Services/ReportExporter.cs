using System.Text.Json;
using HimVote.Core.Models;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class ReportExporter : IReportExporter
{
    public async Task ExportReportAsync(AuditReportDto report, string outputPath)
    {
        var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(outputPath, json);
    }
}