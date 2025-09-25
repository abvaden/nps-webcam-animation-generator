using Common.Interfaces;

namespace ConsoleApp.Implementations;

public class ConsoleLogger : ILogger
{
    public void LogInformation(string message)
    {
        Console.WriteLine(message);
    }

    public void LogError(string message)
    {
        Console.WriteLine($"ERROR: {message}");
    }

    public void LogError(string message, Exception exception)
    {
        Console.WriteLine($"ERROR: {message} - Exception: {exception}");
    }
}
