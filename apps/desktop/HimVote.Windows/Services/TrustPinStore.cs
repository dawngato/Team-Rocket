using System.Security;
using System.Text.Json;
using HimVote.Windows.Models;

namespace HimVote.Windows.Services;

public class TrustPinStore : ITrustPinStore
{
    private readonly string _storagePath;
    private readonly JsonSerializerOptions _jsonOptions;
    private TrustPins? _currentPins;

    public TrustPins? CurrentPins => _currentPins;

    public TrustPinStore(string? customStorePath = null)
    {
        if (string.IsNullOrWhiteSpace(customStorePath))
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var dir = Path.Combine(appData, "HimVote", "TrustPins");
            Directory.CreateDirectory(dir);
            _storagePath = Path.Combine(dir, "pinned_trust.json");
        }
        else
        {
            var parent = Path.GetDirectoryName(customStorePath);
            if (!string.IsNullOrEmpty(parent))
            {
                Directory.CreateDirectory(parent);
            }
            _storagePath = customStorePath;
        }

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };
    }

    public async Task<TrustPins> ImportFromFileAsync(string externalFilePath, string? forbiddenArchiveDirectory = null, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(externalFilePath);

        if (!File.Exists(externalFilePath))
        {
            throw new FileNotFoundException($"Trust pin file not found: {externalFilePath}");
        }

        var fullExternalPath = Path.GetFullPath(externalFilePath);

        if (!string.IsNullOrWhiteSpace(forbiddenArchiveDirectory))
        {
            var fullArchiveDir = Path.GetFullPath(forbiddenArchiveDirectory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var fullExternalDir = Path.GetDirectoryName(fullExternalPath) ?? string.Empty;

            if (fullExternalPath.StartsWith(fullArchiveDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(fullExternalDir, fullArchiveDir, StringComparison.OrdinalIgnoreCase))
            {
                throw new SecurityException("Trust pins must be loaded from an external file chosen by the user, never from inside the imported evidence archive.");
            }
        }

        var json = await File.ReadAllTextAsync(fullExternalPath, cancellationToken);
        var pins = JsonSerializer.Deserialize<TrustPins>(json, _jsonOptions);

        if (pins == null)
        {
            throw new FormatException("Failed to parse trust pin document.");
        }

        ValidatePins(pins);

        await SavePinsAsync(pins, cancellationToken);
        return pins;
    }

    public async Task SavePinsAsync(TrustPins pins, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(pins);
        ValidatePins(pins);

        var json = JsonSerializer.Serialize(pins, _jsonOptions);
        await File.WriteAllTextAsync(_storagePath, json, cancellationToken);
        _currentPins = pins;
    }

    public async Task<TrustPins?> LoadSavedPinsAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_storagePath))
        {
            return null;
        }

        try
        {
            var json = await File.ReadAllTextAsync(_storagePath, cancellationToken);
            var pins = JsonSerializer.Deserialize<TrustPins>(json, _jsonOptions);
            if (pins == null)
            {
                throw new FormatException("Saved trust pin document is empty.");
            }

            ValidatePins(pins);
            _currentPins = pins;
            return pins;
        }
        catch
        {
            _currentPins = null;
            return null;
        }
    }

    public void Clear()
    {
        _currentPins = null;
        if (File.Exists(_storagePath))
        {
            try
            {
                File.Delete(_storagePath);
            }
            catch
            {
            }
        }
    }

    private static void ValidatePins(TrustPins pins)
    {
        if (string.IsNullOrWhiteSpace(pins.ManifestDigest))
        {
            throw new ArgumentException("Trust pins must include a valid manifest digest.");
        }

        if (string.IsNullOrWhiteSpace(pins.WitnessPublicKey))
        {
            throw new ArgumentException("Trust pins must include a valid witness public key.");
        }

        if (string.IsNullOrWhiteSpace(pins.AuthorityPublicKey))
        {
            throw new ArgumentException("Trust pins must include a valid authority public key.");
        }
    }
}
