using FFMpegCore;

namespace Common.Interfaces;

public interface IFFmpegProvider
{
    /// <summary>
    /// Configures FFmpeg for the current platform
    /// </summary>
    /// <returns>True if FFmpeg was successfully configured, false otherwise</returns>
    bool ConfigureFFmpeg();

    /// <summary>
    /// Gets the path to the FFmpeg binary
    /// </summary>
    /// <returns>Path to FFmpeg binary or null if not found</returns>
    string? GetFFmpegPath();
}
