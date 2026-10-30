using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class VerifierRunner : HimVote.Core.Services.VerifierRunner
{
    public VerifierRunner(string? verifierPath = null, string? expectedSha256 = null)
        : base(verifierPath, expectedSha256)
    {
    }
}
