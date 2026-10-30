using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class TrustPinStore : HimVote.Core.Services.TrustPinStore
{
    public TrustPinStore(string? customStorePath = null)
        : base(customStorePath)
    {
    }
}
