using Amazon.Lambda.Core;
using Amazon.S3;
using AWSLambdaGifGenerator.Implementations;
using Common.Services;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AWSLambdaGifGenerator;

public class Function
{
    private static readonly HttpClient httpClient = new HttpClient();
    
    /// <summary>
    /// A simple function that processes GIF creation requests using shared services
    /// </summary>
    /// <param name="input">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<string> FunctionHandler(object input, ILambdaContext context)
    {
        context.Logger.LogInformation("Starting GIF generation process");
        
        try
        {
            // Create platform-specific implementations
            var logger = new AWSLambdaGifGenerator.Implementations.LambdaLogger(context);
            var fileSystemProvider = new LambdaFileSystemProvider();
            var ffmpegProvider = new LambdaFFmpegProvider(logger);
            
            // Configure S3 client with Cloudflare R2 settings
            var s3Config = new AmazonS3Config
            {
                ServiceURL = "https://2fe45168e007c2e57cb029c37eea5318.r2.cloudflarestorage.com",
            };
            var s3Client = new AmazonS3Client("03e89632cf8803a8e0ce2363be783f1d", "b60779f5b3b1a2a7e43477790bcbe31d7cb4840dc7ddfdc326e011cb8b5adb14", s3Config);
            
            // Create shared services
            var s3Service = new S3Service(s3Client, logger);
            var gifProcessingService = new GifProcessingService(fileSystemProvider, ffmpegProvider, logger);
            var apiService = new ApiService(httpClient, logger);
            var gifGenerationService = new GifGenerationService(s3Service, gifProcessingService, apiService, fileSystemProvider, logger);
            
            // Process all pending GIFs
            var result = await gifGenerationService.ProcessPendingGifsAsync();
            
            var resultMessage = result.ToString();
            context.Logger.LogInformation(resultMessage);
            return resultMessage;
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Fatal error in Lambda function: {ex.Message}");
            return $"Fatal error: {ex.Message}";
        }
    }
}
