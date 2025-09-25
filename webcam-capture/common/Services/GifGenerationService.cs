using Amazon.S3;
using Common.Interfaces;
using Common.Models;

namespace Common.Services;

public class GifGenerationService
{
    private readonly S3Service _s3Service;
    private readonly GifProcessingService _gifProcessingService;
    private readonly ApiService _apiService;
    private readonly IFileSystemProvider _fileSystemProvider;
    private readonly ILogger _logger;

    public GifGenerationService(
        S3Service s3Service,
        GifProcessingService gifProcessingService,
        ApiService apiService,
        IFileSystemProvider fileSystemProvider,
        ILogger logger)
    {
        _s3Service = s3Service;
        _gifProcessingService = gifProcessingService;
        _apiService = apiService;
        _fileSystemProvider = fileSystemProvider;
        _logger = logger;
    }

    /// <summary>
    /// Processes all pending GIFs using S3 direct access
    /// </summary>
    /// <returns>Processing results summary</returns>
    public async Task<ProcessingResult> ProcessPendingGifsAsync()
    {
        var result = new ProcessingResult();
        
        try
        {
            // Get GIFs to create from API
            var gifsResponse = await _apiService.GetGifsToCreateAsync();
            
            if (gifsResponse?.success != true || gifsResponse.gifs.Count == 0)
            {
                _logger.LogInformation("No GIFs to create");
                return result;
            }

            _logger.LogInformation($"Found {gifsResponse.gifs.Count} GIFs to process");

            foreach (var gifToCreate in gifsResponse.gifs)
            {
                result.ProcessedCount++;
                _logger.LogInformation($"Processing GIF {result.ProcessedCount}/{gifsResponse.gifs.Count}: {gifToCreate.referenceId}");
                
                try
                {
                    if (await ProcessSingleGifAsync(gifToCreate))
                    {
                        result.SuccessCount++;
                        _logger.LogInformation($"Successfully processed GIF: {gifToCreate.referenceId}");
                    }
                    else
                    {
                        result.ErrorCount++;
                        _logger.LogError($"Failed to process GIF: {gifToCreate.referenceId}");
                    }
                }
                catch (Exception ex)
                {
                    result.ErrorCount++;
                    _logger.LogError($"Error processing GIF {gifToCreate.referenceId}: {ex.Message}", ex);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Fatal error in GIF processing: {ex.Message}", ex);
            result.FatalError = ex.Message;
        }

        _logger.LogInformation($"Processing complete. Processed: {result.ProcessedCount}, Success: {result.SuccessCount}, Errors: {result.ErrorCount}");
        return result;
    }

    /// <summary>
    /// Processes a single GIF using S3 direct access
    /// </summary>
    /// <param name="gifToCreate">GIF to process</param>
    /// <returns>True if successful, false otherwise</returns>
    private async Task<bool> ProcessSingleGifAsync(Gif gifToCreate)
    {
        string? tempDir = null;
        string? frameDir = null;

        try
        {
            _logger.LogInformation($"Downloading {gifToCreate.imageList.Count} images from S3...");

            // Create temporary directory for processing
            tempDir = _fileSystemProvider.CreateTempDirectory($"gif_processing_{gifToCreate.referenceId}");

            // Download images directly from S3
            var imageFiles = await _s3Service.DownloadImagesAsync(gifToCreate.imageList.Distinct().ToList(), tempDir);
            if (imageFiles.Count == 0)
            {
                _logger.LogError($"No images were successfully downloaded for GIF: {gifToCreate.referenceId}");
                return false;
            }

            frameDir = _fileSystemProvider.CreateTempDirectory($"{gifToCreate.referenceId}_frames");

            // Order image files by frame
            for (var i = 0; i < gifToCreate.imageList.Count; i++)
            {
                var frameFilePath = Path.Combine(frameDir, $"frame_{i:D3}.jpg");
                var imageName = gifToCreate.imageList[i].Substring(gifToCreate.imageList[i].LastIndexOf("/") + 1);
                var sourceImagePath = imageFiles.Single(x => x.EndsWith(imageName));

                if (string.IsNullOrEmpty(sourceImagePath))
                {
                    _logger.LogError("Could not find image to convert to frame after download");
                    return false;
                }

                File.Copy(sourceImagePath, frameFilePath);
            }

            _logger.LogInformation($"Successfully downloaded {imageFiles.Count} images. Creating GIF...");

            // Create GIF from downloaded images
            var outputPath = await _gifProcessingService.CreateGifFromImageFilesAsync(frameDir, gifToCreate.referenceId);

            if (outputPath == null)
            {
                _logger.LogError($"Failed to create GIF file for {gifToCreate.referenceId}");
                return false;
            }

            // Upload GIF to S3
            if (string.IsNullOrEmpty(gifToCreate.gifStorageKey))
            {
                _logger.LogError($"No gif_storage_key provided for GIF: {gifToCreate.referenceId}");
                return false;
            }

            if (!await _s3Service.UploadGifAsync(outputPath, gifToCreate.gifStorageKey))
            {
                _logger.LogError($"Failed to upload GIF to S3 for {gifToCreate.referenceId}");
                return false;
            }

            // Mark GIF as complete via API
            if (!await _apiService.MarkGifCompleteAsync(gifToCreate.id))
            {
                _logger.LogError($"Failed to mark GIF as complete for {gifToCreate.referenceId}");
                return false;
            }

            // Clean up the output file
            if (File.Exists(outputPath))
            {
                File.Delete(outputPath);
            }

            return true;
        }
        finally
        {
            // Clean up temporary directory
            if (tempDir != null)
            {
                _fileSystemProvider.CleanupPath(tempDir);
            }

            if (frameDir != null)
            {
                _fileSystemProvider.CleanupPath(frameDir);
            }
        }
    }
}

public class ProcessingResult
{
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public string? FatalError { get; set; }

    public override string ToString()
    {
        if (!string.IsNullOrEmpty(FatalError))
        {
            return $"Fatal error: {FatalError}";
        }
        
        return $"Processed {ProcessedCount} GIFs. Success: {SuccessCount}, Errors: {ErrorCount}";
    }
}
