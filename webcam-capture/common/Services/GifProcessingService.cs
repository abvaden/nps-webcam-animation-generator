using FFMpegCore;
using Common.Interfaces;
using FFMpegCore.Enums;

namespace Common.Services;

public class GifProcessingService
{
    private readonly IFileSystemProvider _fileSystemProvider;
    private readonly IFFmpegProvider _ffmpegProvider;
    private readonly ILogger _logger;

    public GifProcessingService(
        IFileSystemProvider fileSystemProvider,
        IFFmpegProvider ffmpegProvider,
        ILogger logger)
    {
        _fileSystemProvider = fileSystemProvider;
        _ffmpegProvider = ffmpegProvider;
        _logger = logger;
    }

    /// <summary>
    /// Creates a GIF from a list of image files
    /// </summary>
    /// <param name="imageFiles">List of image file paths</param>
    /// <param name="referenceId">Reference ID for the GIF</param>
    /// <returns>Path to the created GIF file, or null if creation failed</returns>
    public async Task<string?> CreateGifFromImageFilesAsync(string frameDirectory, string referenceId)
    {
        try
        {
            // Ensure FFmpeg is configured
            if (!_ffmpegProvider.ConfigureFFmpeg())
            {
                _logger.LogError("FFmpeg configuration failed");
                return null;
            }

            // Output GIF path
            var outputPath = _fileSystemProvider.GetOutputPath($"{referenceId}.mp4");

            // Get the directory containing the image files
            if (string.IsNullOrEmpty(frameDirectory))
            {
                _logger.LogError($"Could not determine temp directory for GIF: {referenceId}");
                return null;
            }

            // Create GIF using FFMpegCore
            await FFMpegArguments
                .FromFileInput(Path.Combine(frameDirectory, "frame_%03d.jpg"), false)
                .OutputToFile(outputPath, true, options => options
                    .WithVideoBitrate(2315)
                    .WithAudioBitrate(0)
                    .WithFramerate(20)
                    .WithVideoCodec(VideoCodec.LibX264)
                        .WithConstantRateFactor(28)
                    .WithVariableBitrate(4)
                    .WithVideoFilters(f => f.Scale(VideoSize.FullHd)))
                .ProcessAsynchronously();

            _logger.LogInformation($"GIF created successfully: {outputPath}");

            return outputPath;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating GIF for {referenceId}: {ex.Message}", ex);
            return null;
        }
    }
}
