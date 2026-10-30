using System.Globalization;
using Avalonia.Data.Converters;
using HimVote.Core.Models;

namespace HimVote.Linux.Converters;

public class StatusToIconConverter : IValueConverter
{
    public static readonly StatusToIconConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var status = value?.ToString()?.Trim().ToUpperInvariant() ?? string.Empty;

        return status switch
        {
            PropertyStatuses.Pass => "✓ PASS",
            PropertyStatuses.Fail => "✕ FAIL",
            PropertyStatuses.Limited => "▲ LIMITED",
            PropertyStatuses.Assumed => "ℹ ASSUMED",
            PropertyStatuses.NotSupported => "○ NOT SUPPORTED",
            PropertyStatuses.Unverifiable => "◆ UNVERIFIABLE",
            _ => status
        };
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
