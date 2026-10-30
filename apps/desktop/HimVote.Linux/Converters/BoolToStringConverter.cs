using System.Globalization;
using Avalonia.Data.Converters;

namespace HimVote.Linux.Converters;

public class BoolToStringConverter : IValueConverter
{
    public static readonly BoolToStringConverter TrueFalse = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var paramStr = parameter as string ?? "True|False";
        var parts = paramStr.Split('|');
        var trueText = parts.Length > 0 ? parts[0] : "True";
        var falseText = parts.Length > 1 ? parts[1] : "False";

        if (value is bool b)
        {
            return b ? trueText : falseText;
        }

        return falseText;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
