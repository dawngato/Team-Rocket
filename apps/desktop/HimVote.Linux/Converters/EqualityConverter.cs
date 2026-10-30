using System.Globalization;
using Avalonia.Data.Converters;

namespace HimVote.Linux.Converters;

public class EqualityConverter : IValueConverter
{
    public static readonly EqualityConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var valStr = value?.ToString() ?? string.Empty;
        var paramStr = parameter?.ToString() ?? string.Empty;
        return string.Equals(valStr, paramStr, StringComparison.OrdinalIgnoreCase);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
