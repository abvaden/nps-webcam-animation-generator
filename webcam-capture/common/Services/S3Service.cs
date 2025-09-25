using Amazon.S3;
using Amazon.S3.Model;
using Common.Interfaces;

namespace Common.Services;

public class S3Service
{
    private readonly AmazonS3Client _s3Client;
    private readonly ILogger _logger;
    private readonly string _bucketName;

    public S3Service(AmazonS3Client s3Client, ILogger logger, string bucketName = "nps-webcam-animations")
    {
        _s3Client = s3Client;
        _logger = logger;
        _bucketName = bucketName;
    }

    /// <summary>
    /// Downloads an image from S3 and saves it to the specified path
    /// </summary>
    /// <param name="imageKey">S3 key of the image</param>
    /// <param name="localPath">Local path to save the image</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> DownloadImageAsync(string imageKey, string localPath)
    {
        try
        {
            _logger.LogInformation($"Downloading image: {imageKey}");
            
            var objResult = await _s3Client.GetObjectAsync(_bucketName, imageKey);
            await objResult.WriteResponseStreamToFileAsync(localPath, false, CancellationToken.None);
            
            _logger.LogInformation($"Successfully downloaded: {imageKey}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to download image {imageKey}: {ex.Message}", ex);
            return false;
        }
    }

    /// <summary>
    /// Downloads multiple images from S3 to a temporary directory
    /// </summary>
    /// <param name="imageKeys">List of S3 keys to download</param>
    /// <param name="tempDirectory">Directory to save images to</param>
    /// <returns>List of successfully downloaded file paths</returns>
    public async Task<List<string>> DownloadImagesAsync(List<string> imageKeys, string tempDirectory)
    {
        var downloadedFiles = new List<string>();
        
        _logger.LogInformation($"Downloading {imageKeys.Count} images from S3...");
        
        for (int i = 0; i < imageKeys.Count; i++)
        {
            var imageKey = imageKeys[i];
            var imageTimestamp = imageKey.Substring(imageKey.LastIndexOf("/") + 1);
            var tempImagePath = Path.Combine(tempDirectory, $"{imageTimestamp}");
            
            if (await DownloadImageAsync(imageKey, tempImagePath))
            {
                downloadedFiles.Add(tempImagePath);
                _logger.LogInformation($"Successfully downloaded frame {i + 1}/{imageKeys.Count}");
            }
            else
            {
                _logger.LogError($"Failed to download frame {i + 1}/{imageKeys.Count}: {imageKey}");
            }
        }
        
        _logger.LogInformation($"Successfully downloaded {downloadedFiles.Count}/{imageKeys.Count} images");
        return downloadedFiles;
    }

    /// <summary>
    /// Uploads a GIF file to S3
    /// </summary>
    /// <param name="filePath">Local path to the GIF file</param>
    /// <param name="s3Key">S3 key to upload to</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> UploadGifAsync(string filePath, string s3Key)
    {
        try
        {
            _logger.LogInformation($"Uploading GIF to S3: {s3Key}");
            
            await _s3Client.PutObjectAsync(new PutObjectRequest
            {
                BucketName = _bucketName,
                FilePath = filePath,
                Key = s3Key,
                DisablePayloadSigning = true,
                DisableDefaultChecksumValidation = true,
            });
            
            _logger.LogInformation($"Successfully uploaded GIF: {s3Key}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to upload GIF {s3Key}: {ex.Message}", ex);
            return false;
        }
    }
}
