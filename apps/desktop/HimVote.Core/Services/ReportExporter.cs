using System.Text;
using System.Text.Json;
using HimVote.Core.Models;

namespace HimVote.Core.Services;

public class ReportExporter : IReportExporter
{
    private readonly JsonSerializerOptions _jsonOptions;

    public ReportExporter()
    {
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };
    }

    public string ExportToJson(AuditReport report)
    {
        ArgumentNullException.ThrowIfNull(report);
        return JsonSerializer.Serialize(report, _jsonOptions);
    }

    public string ExportToText(AuditReport report)
    {
        ArgumentNullException.ThrowIfNull(report);

        var sb = new StringBuilder();
        sb.AppendLine("================================================================================");
        sb.AppendLine("                     HIMVOTE INSTITUTIONAL AUDIT REPORT                         ");
        sb.AppendLine("================================================================================");
        sb.AppendLine();
        sb.AppendLine($"Election Identifier   : {report.ElectionId}");
        sb.AppendLine($"Manifest Digest       : {report.ManifestDigest}");
        sb.AppendLine($"Verifier SHA256       : {report.VerifierChecksum}");
        sb.AppendLine($"Verifier Version      : {report.VerifierVersion}");
        sb.AppendLine($"Report Generated UTC  : {report.GeneratedAtUtc:u}");
        sb.AppendLine($"Process Exit Code     : {report.ExitCode}");
        sb.AppendLine($"Overall Status        : {report.OverallStatus}");
        sb.AppendLine();
        sb.AppendLine("________________________________________________________________________________");
        sb.AppendLine("                         VERIFICATION PROPERTIES                                ");
        sb.AppendLine("________________________________________________________________________________");
        sb.AppendLine(string.Format("{0,-32} | {1,-14} | {2,-18} | {3}", "Property Name", "Status", "Failure Code", "Summary"));
        sb.AppendLine("================================================================================");

        foreach (var prop in report.Properties)
        {
            sb.AppendLine(string.Format("{0,-32} | {1,-14} | {2,-18} | {3}",
                prop.PropertyName,
                prop.Status,
                prop.FailureCode,
                prop.Summary));
        }

        sb.AppendLine();
        sb.AppendLine("________________________________________________________________________________");
        sb.AppendLine("                 SIDE BY SIDE ROOT INTEGRITY COMPARISON                         ");
        sb.AppendLine("________________________________________________________________________________");
        sb.AppendLine($"Published Merkle Root : {report.RootComparison.PublishedRoot}");
        sb.AppendLine($"Computed Merkle Root  : {report.RootComparison.ComputedRoot}");
        sb.AppendLine($"Root Match Result     : {(report.RootComparison.Matches ? "MATCH" : "MISMATCH")}");
        sb.AppendLine();
        sb.AppendLine("________________________________________________________________________________");
        sb.AppendLine("                 SIDE BY SIDE TALLY VERIFICATION COMPARISON                     ");
        sb.AppendLine("________________________________________________________________________________");
        sb.AppendLine($"Published Total Votes : {report.TallyComparison.PublishedTotalBallots}");
        sb.AppendLine($"Computed Total Votes  : {report.TallyComparison.ComputedTotalBallots}");
        sb.AppendLine($"Total Match Result    : {(report.TallyComparison.Matches ? "MATCH" : "MISMATCH")}");
        sb.AppendLine();

        if (report.TallyComparison.Candidates.Count > 0)
        {
            sb.AppendLine(string.Format("{0,-20} | {1,-24} | {2,-10} | {3,-10} | {4}", "Candidate ID", "Candidate Name", "Published", "Computed", "Result"));
            sb.AppendLine("================================================================================");
            foreach (var cand in report.TallyComparison.Candidates)
            {
                sb.AppendLine(string.Format("{0,-20} | {1,-24} | {2,-10} | {3,-10} | {4}",
                    cand.CandidateId,
                    cand.CandidateName,
                    cand.PublishedVotes,
                    cand.ComputedVotes,
                    cand.Matches ? "MATCH" : "MISMATCH"));
            }
        }

        sb.AppendLine("================================================================================");
        sb.AppendLine("                           END OF AUDIT REPORT                                  ");
        sb.AppendLine("================================================================================");

        return sb.ToString();
    }

    public async Task ExportToJsonFileAsync(AuditReport report, string filePath, CancellationToken cancellationToken = default)
    {
        var json = ExportToJson(report);
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        await File.WriteAllTextAsync(filePath, json, cancellationToken);
    }

    public async Task ExportToTextFileAsync(AuditReport report, string filePath, CancellationToken cancellationToken = default)
    {
        var text = ExportToText(report);
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        await File.WriteAllTextAsync(filePath, text, cancellationToken);
    }

    public async Task ExportReportAsync(AuditReportDto report, string outputPath)
    {
        var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
        var dir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        await File.WriteAllTextAsync(outputPath, json);
    }
}
