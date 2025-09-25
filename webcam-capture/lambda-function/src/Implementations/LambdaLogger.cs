using Amazon.Lambda.Core;
using Common.Interfaces;

namespace AWSLambdaGifGenerator.Implementations;

public class LambdaLogger : Common.Interfaces.ILogger
{
    private readonly ILambdaContext _context;

    public LambdaLogger(ILambdaContext context)
    {
        _context = context;
    }

    public void LogInformation(string message)
    {
        _context.Logger.LogInformation(message);
    }

    public void LogError(string message)
    {
        _context.Logger.LogError(message);
    }

    public void LogError(string message, Exception exception)
    {
        _context.Logger.LogError($"{message} - Exception: {exception}");
    }
}
