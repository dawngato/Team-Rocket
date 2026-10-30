using System.Globalization;
using Avalonia.Media;
using HimVote.Core.Models;
using HimVote.Linux.Converters;
using HimVote.Linux.Views;
using Xunit;

namespace HimVote.Windows.Tests.Linux;

public class AvaloniaViewsAndConvertersTests
{
    [Fact]
    public void StatusToBrushConverter_ReturnsExpectedBrushesForStatuses()
    {
        var converter = StatusToBrushConverter.Instance;

        var passBg = converter.Convert("PASS", typeof(IBrush), "background", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(passBg);
        Assert.Equal(Color.Parse("#DCFCE7"), passBg.Color);

        var passFg = converter.Convert("PASS", typeof(IBrush), "foreground", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(passFg);
        Assert.Equal(Color.Parse("#15805D"), passFg.Color);

        var passBorder = converter.Convert("PASS", typeof(IBrush), "border", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(passBorder);
        Assert.Equal(Color.Parse("#86EFAC"), passBorder.Color);

        var failBg = converter.Convert("FAIL", typeof(IBrush), "background", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(failBg);
        Assert.Equal(Color.Parse("#FEE2E2"), failBg.Color);

        var limitedBg = converter.Convert("LIMITED", typeof(IBrush), "background", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(limitedBg);
        Assert.Equal(Color.Parse("#FEF3C7"), limitedBg.Color);

        var assumedBg = converter.Convert("ASSUMED", typeof(IBrush), "background", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(assumedBg);
        Assert.Equal(Color.Parse("#DBEAFE"), assumedBg.Color);

        var notSupportedBg = converter.Convert("NOT_SUPPORTED", typeof(IBrush), "background", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(notSupportedBg);
        Assert.Equal(Color.Parse("#F1F5F9"), notSupportedBg.Color);

        var unverifiableBg = converter.Convert("UNVERIFIABLE", typeof(IBrush), "background", CultureInfo.InvariantCulture) as SolidColorBrush;
        Assert.NotNull(unverifiableBg);
        Assert.Equal(Color.Parse("#FFEDD5"), unverifiableBg.Color);
    }

    [Fact]
    public void StatusToIconConverter_ReturnsExpectedSymbols()
    {
        var converter = StatusToIconConverter.Instance;

        Assert.Equal("✓ PASS", converter.Convert("PASS", typeof(string), null, CultureInfo.InvariantCulture));
        Assert.Equal("✕ FAIL", converter.Convert("FAIL", typeof(string), null, CultureInfo.InvariantCulture));
        Assert.Equal("▲ LIMITED", converter.Convert("LIMITED", typeof(string), null, CultureInfo.InvariantCulture));
        Assert.Equal("ℹ ASSUMED", converter.Convert("ASSUMED", typeof(string), null, CultureInfo.InvariantCulture));
        Assert.Equal("○ NOT SUPPORTED", converter.Convert("NOT_SUPPORTED", typeof(string), null, CultureInfo.InvariantCulture));
        Assert.Equal("◆ UNVERIFIABLE", converter.Convert("UNVERIFIABLE", typeof(string), null, CultureInfo.InvariantCulture));
    }

    [Fact]
    public void NullOrEmptyToBoolConverter_EvaluatesStringsAndCollections()
    {
        var notEmpty = NullOrEmptyToBoolConverter.NotEmpty;
        var empty = NullOrEmptyToBoolConverter.Empty;

        Assert.True((bool)notEmpty.Convert("active", typeof(bool), null, CultureInfo.InvariantCulture)!);
        Assert.False((bool)notEmpty.Convert("", typeof(bool), null, CultureInfo.InvariantCulture)!);
        Assert.False((bool)notEmpty.Convert(null, typeof(bool), null, CultureInfo.InvariantCulture)!);

        Assert.False((bool)empty.Convert("active", typeof(bool), null, CultureInfo.InvariantCulture)!);
        Assert.True((bool)empty.Convert("", typeof(bool), null, CultureInfo.InvariantCulture)!);
        Assert.True((bool)empty.Convert(null, typeof(bool), null, CultureInfo.InvariantCulture)!);

        var list = new List<string> { "item" };
        Assert.True((bool)notEmpty.Convert(list, typeof(bool), null, CultureInfo.InvariantCulture)!);
        Assert.False((bool)notEmpty.Convert(new List<string>(), typeof(bool), null, CultureInfo.InvariantCulture)!);
    }

    [Fact]
    public void EqualityConverter_EvaluatesCorrectly()
    {
        var converter = EqualityConverter.Instance;

        Assert.True((bool)converter.Convert("audit", typeof(bool), "audit", CultureInfo.InvariantCulture)!);
        Assert.True((bool)converter.Convert("AUDIT", typeof(bool), "audit", CultureInfo.InvariantCulture)!);
        Assert.False((bool)converter.Convert("elections", typeof(bool), "audit", CultureInfo.InvariantCulture)!);
    }
}
