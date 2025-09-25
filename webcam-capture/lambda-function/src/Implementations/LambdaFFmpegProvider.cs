using FFMpegCore;
using Common.Interfaces;

namespace AWSLambdaGifGenerator.Implementations;

public class LambdaFFmpegProvider : IFFmpegProvider
{
    private readonly Common.Interfaces.ILogger _logger;

    public LambdaFFmpegProvider(Common.Interfaces.ILogger logger)
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
                if (ffmpegPath != "ffmpeg")
                {
                    GlobalFFOptions.Configure(new FFOptions { BinaryFolder = Path.GetDirectoryName(ffmpegPath) });
                }
                _logger.LogInformation($"Using FFmpeg from: {ffmpegPath}");
                return true;
            }
            else
            {
                _logger.LogError("FFmpeg not found. Please ensure FFmpeg is available via Lambda Layer or bundled in deployment.");
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
        // Try multiple possible FFmpeg locations for Lambda
        string[] possiblePaths = {
            "/opt/bin/ffmpeg",           // Lambda Layer
            "/usr/bin/ffmpeg",           // System installation
            "/tmp/ffmpeg",               // Bundled with deployment
            "ffmpeg"                     // PATH
        };

        foreach (var path in possiblePaths)
        {
            if (File.Exists(path) || path == "ffmpeg")
            {
                return path;
            }
        }

        return null;
    }
}
