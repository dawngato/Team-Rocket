using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class VerifierRunner : IVerifierRunner
{
    private readonly string _verifierPath;
    private readonly string _expectedSha256;

    public VerifierRunner(string verifierPath, string expectedSha256)
    {
        _verifierPath = verifierPath;
        _expectedSha256 = expectedSha256;
    }

    public async Task<(bool Success, string Output, string Sha256)> RunAsync(string args)
    {
        var actualSha = ComputeSha256(_verifierPath);
        if (!string.Equals(actualSha, _expectedSha256, StringComparison.OrdinalIgnoreCase))
        {
            return (false, $"Verifier SHA256 mismatch: expected {_expectedSha256}, got {actualSha}", actualSha);
        }

        var psi = new ProcessStartInfo
        {
            FileName = _verifierPath,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        using var process = Process.Start(psi);
        if (process == null)
            return (false, "Failed to start verifier process", actualSha);

        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var output = await outputTask;
        var error = await errorTask;

        return (process.ExitCode == 0, $"{output}\n{error}", actualSha);
    }

    private static string ComputeSha256(string path)
    {
        if (!File.Exists(path)) return string.Empty;
        using var sha = SHA256.Create();
        using var stream = File.OpenRead(path);
        return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
    }
}