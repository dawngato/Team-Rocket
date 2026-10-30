using System.Globalization;
using Avalonia.Data.Converters;

namespace HimVote.Linux.Converters;

public class ObjectToBoolConverter : IValueConverter
{
    public static readonly ObjectToBoolConverter IsNotNull = new(invert: false);
    public static readonly ObjectToBoolConverter IsNull = new(invert: true);

    private readonly bool _invert;

    public ObjectToBoolConverter(bool invert = false)
    {
        _invert = invert;
    }

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        bool isNotNull = value != null;
        return _invert ? !isNotNull : isNotNull;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
