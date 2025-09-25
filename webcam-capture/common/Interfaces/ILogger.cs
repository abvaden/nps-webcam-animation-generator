namespace Common.Interfaces;

public interface ILogger
{
    /// <summary>
    /// Logs an informational message
    /// </summary>
    /// <param name="message">Message to log</param>
    void LogInformation(string message);

    /// <summary>
    /// Logs an error message
    /// </summary>
    /// <param name="message">Error message to log</param>
    void LogError(string message);

    /// <summary>
    /// Logs an error with exception details
    /// </summary>
    /// <param name="message">Error message to log</param>
    /// <param name="exception">Exception that occurred</param>
    void LogError(string message, Exception exception);
}
