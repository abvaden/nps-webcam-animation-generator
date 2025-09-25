using Amazon.S3;
using ConsoleApp.Implementations;
using Common.Services;



// Configure S3 client with Cloudflare R2 settings
var s3Config = new AmazonS3Config
{
    ServiceURL = "https://2fe45168e007c2e57cb029c37eea5318.r2.cloudflarestorage.com",
};
var s3Client = new AmazonS3Client("03e89632cf8803a8e0ce2363be783f1d", "b60779f5b3b1a2a7e43477790bcbe31d7cb4840dc7ddfdc326e011cb8b5adb14", s3Config);

// Create platform-specific implementations
var logger = new ConsoleLogger();
var fileSystemProvider = new ConsoleFileSystemProvider();
var ffmpegProvider = new ConsoleFFmpegProvider(logger);
var httpClient = new HttpClient();

// Create shared services
var s3Service = new S3Service(s3Client, logger);
var gifProcessingService = new GifProcessingService(fileSystemProvider, ffmpegProvider, logger);
var apiService = new ApiService(httpClient, logger);
var gifGenerationService = new GifGenerationService(s3Service, gifProcessingService, apiService, fileSystemProvider, logger);

// Process all pending GIFs
var result = await gifGenerationService.ProcessPendingGifsAsync();

Console.WriteLine(result.ToString());

// Clean up
httpClient.Dispose();
s3Client.Dispose();
