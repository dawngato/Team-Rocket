using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia.Media;
using HimVote.Core.Models;

namespace HimVote.Linux.Converters;

public class StatusToBrushConverter : IValueConverter
{
    public static readonly StatusToBrushConverter Instance = new();

    private static readonly IBrush PassBg = new SolidColorBrush(Color.Parse("#DCFCE7"));
    private static readonly IBrush PassFg = new SolidColorBrush(Color.Parse("#15805D"));
    private static readonly IBrush PassBorder = new SolidColorBrush(Color.Parse("#86EFAC"));

    private static readonly IBrush FailBg = new SolidColorBrush(Color.Parse("#FEE2E2"));
    private static readonly IBrush FailFg = new SolidColorBrush(Color.Parse("#C23C45"));
    private static readonly IBrush FailBorder = new SolidColorBrush(Color.Parse("#FCA5A5"));

    private static readonly IBrush LimitedBg = new SolidColorBrush(Color.Parse("#FEF3C7"));
    private static readonly IBrush LimitedFg = new SolidColorBrush(Color.Parse("#B45309"));
    private static readonly IBrush LimitedBorder = new SolidColorBrush(Color.Parse("#FCD34D"));

    private static readonly IBrush AssumedBg = new SolidColorBrush(Color.Parse("#DBEAFE"));
    private static readonly IBrush AssumedFg = new SolidColorBrush(Color.Parse("#1E40AF"));
    private static readonly IBrush AssumedBorder = new SolidColorBrush(Color.Parse("#93C5FD"));

    private static readonly IBrush NotSupportedBg = new SolidColorBrush(Color.Parse("#F1F5F9"));
    private static readonly IBrush NotSupportedFg = new SolidColorBrush(Color.Parse("#475569"));
    private static readonly IBrush NotSupportedBorder = new SolidColorBrush(Color.Parse("#CBD5E1"));

    private static readonly IBrush UnverifiableBg = new SolidColorBrush(Color.Parse("#FFEDD5"));
    private static readonly IBrush UnverifiableFg = new SolidColorBrush(Color.Parse("#C2410C"));
    private static readonly IBrush UnverifiableBorder = new SolidColorBrush(Color.Parse("#FDBA74"));

    private static readonly IBrush DefaultBg = new SolidColorBrush(Color.Parse("#F8FAFC"));
    private static readonly IBrush DefaultFg = new SolidColorBrush(Color.Parse("#334155"));
    private static readonly IBrush DefaultBorder = new SolidColorBrush(Color.Parse("#E2E8F0"));

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var status = value?.ToString()?.Trim().ToUpperInvariant() ?? string.Empty;
        var mode = parameter?.ToString()?.Trim().ToLowerInvariant() ?? "background";

        return (status, mode) switch
        {
            (PropertyStatuses.Pass, "foreground") => PassFg,
            (PropertyStatuses.Pass, "border") => PassBorder,
            (PropertyStatuses.Pass, _) => PassBg,

            (PropertyStatuses.Fail, "foreground") => FailFg,
            (PropertyStatuses.Fail, "border") => FailBorder,
            (PropertyStatuses.Fail, _) => FailBg,

            (PropertyStatuses.Limited, "foreground") => LimitedFg,
            (PropertyStatuses.Limited, "border") => LimitedBorder,
            (PropertyStatuses.Limited, _) => LimitedBg,

            (PropertyStatuses.Assumed, "foreground") => AssumedFg,
            (PropertyStatuses.Assumed, "border") => AssumedBorder,
            (PropertyStatuses.Assumed, _) => AssumedBg,

            (PropertyStatuses.NotSupported, "foreground") => NotSupportedFg,
            (PropertyStatuses.NotSupported, "border") => NotSupportedBorder,
            (PropertyStatuses.NotSupported, _) => NotSupportedBg,

            (PropertyStatuses.Unverifiable, "foreground") => UnverifiableFg,
            (PropertyStatuses.Unverifiable, "border") => UnverifiableBorder,
            (PropertyStatuses.Unverifiable, _) => UnverifiableBg,

            (_, "foreground") => DefaultFg,
            (_, "border") => DefaultBorder,
            _ => DefaultBg
        };
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
