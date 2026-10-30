#if !WINDOWS
using System;
using System.ComponentModel;

namespace Microsoft.UI.Xaml
{
    public class DependencyObject : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged(string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    public class UIElement : DependencyObject
    {
        public bool IsVisible { get; set; } = true;
        public bool IsEnabled { get; set; } = true;
    }

    public class FrameworkElement : UIElement
    {
        public string Name { get; set; } = string.Empty;
        public object? Tag { get; set; }
        public object? DataContext { get; set; }
    }

    public class Window
    {
        public object? Content { get; set; }
        public string Title { get; set; } = string.Empty;
        public void Activate() { }
        public void Close() { }
    }

    public class Application
    {
        public static Application? Current { get; set; }
        public virtual void InitializeComponent() { }
        protected virtual void OnLaunched(LaunchActivatedEventArgs args) { }
        public void Exit() { }
    }

    public class LaunchActivatedEventArgs : EventArgs
    {
        public string Arguments { get; set; } = string.Empty;
    }

    public class RoutedEventArgs : EventArgs
    {
        public object? OriginalSource { get; set; }
    }

    public delegate void RoutedEventHandler(object sender, RoutedEventArgs e);
}

namespace Microsoft.UI.Xaml.Controls
{
    public class Control : Microsoft.UI.Xaml.FrameworkElement
    {
    }

    public class ContentControl : Control
    {
        public object? Content { get; set; }
    }

    public class UserControl : ContentControl
    {
    }

    public class Page : UserControl
    {
        public Frame? Frame { get; set; }
        protected virtual void OnNavigatedTo(NavigationEventArgs e) { }
        protected virtual void OnNavigatedFrom(NavigationEventArgs e) { }
    }

    public class Frame : ContentControl
    {
        public bool Navigate(Type sourcePageType, object? parameter = null)
        {
            return true;
        }

        public bool CanGoBack { get; set; }
        public void GoBack() { }
    }

    public class NavigationEventArgs : EventArgs
    {
        public object? Parameter { get; set; }
        public Type? SourcePageType { get; set; }
    }
}
#endif
