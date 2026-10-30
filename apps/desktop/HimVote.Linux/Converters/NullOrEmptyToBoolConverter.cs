using System.Collections;
using System.Globalization;
using Avalonia.Data.Converters;

namespace HimVote.Linux.Converters;

public class NullOrEmptyToBoolConverter : IValueConverter
{
    public static readonly NullOrEmptyToBoolConverter NotEmpty = new(invert: false);
    public static readonly NullOrEmptyToBoolConverter Empty = new(invert: true);

    private readonly bool _invert;

    public NullOrEmptyToBoolConverter(bool invert = false)
    {
        _invert = invert;
    }

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var hasValue = false;

        if (value is null)
        {
            hasValue = false;
        }
        else if (value is string s)
        {
            hasValue = !string.IsNullOrWhiteSpace(s);
        }
        else if (value is ICollection coll)
        {
            hasValue = coll.Count > 0;
        }
        else if (value is IEnumerable enumerable)
        {
            var enumerator = enumerable.GetEnumerator();
            hasValue = enumerator.MoveNext();
        }
        else
        {
            hasValue = true;
        }

        return _invert ? !hasValue : hasValue;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
