using System.Collections.Generic;
using HimVote.Core.Services;

namespace HimVote.Linux.Services;

public class TrustPinStore : ITrustPinStore
{
    private readonly Dictionary<string, string> _pins = new();

    public void SetPin(string name, string value) => _pins[name] = value;
    public string? GetPin(string name) => _pins.TryGetValue(name, out var v) ? v : null;
    public bool Contains(string name) => _pins.ContainsKey(name);
}