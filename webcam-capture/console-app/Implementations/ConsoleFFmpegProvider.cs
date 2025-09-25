using FFMpegCore;
using Common.Interfaces;

namespace ConsoleApp.Implementations;

public class ConsoleFFmpegProvider : IFFmpegProvider
{
    private readonly ILogger _logger;

    public ConsoleFFmpegProvider(ILogger logger)
    {
        _logger = logger;
    }

    public bool ConfigureFFmpeg()
    {
        try
        {
            var ffmpegPath = GetFFmpegPath();
            if (ffmpegPath != null)
            {
                GlobalFFOptions.Configure(new FFOptions { BinaryFolder = Path.GetDirectoryName(ffmpegPath) });
                _logger.LogInformation($"Using FFmpeg from: {ffmpegPath}");
                return true;
            }
            else
            {
                _logger.LogError("FFmpeg not found in PATH. Please install FFmpeg or ensure it's in your system PATH.");
                _logger.LogError("You can download FFmpeg from: https://ffmpeg.org/download.html");
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error configuring FFmpeg: {ex.Message}", ex);
            return false;
        }
    }

    public string? GetFFmpegPath()
    {
        // Try to find FFmpeg in system PATH first
        var pathVariable = Environment.GetEnvironmentVariable("PATH");
        if (!string.IsNullOrEmpty(pathVariable))
        {
            var paths = pathVariable.Split(Path.PathSeparator);
            foreach (var path in paths)
            {
                var ffmpegPath = Path.Combine(path, "ffmpeg.exe");
                if (File.Exists(ffmpegPath))
                    return ffmpegPath;
            }
        }

        // Fallback to common installation location
        var fallbackPath = "c:\\bin\\ffmpeg.exe";
        if (File.Exists(fallbackPath))
            return fallbackPath;

        return null;
    }
}
