# AWS Lambda GIF Generator

This AWS Lambda function duplicates the functionality of the console application for generating GIFs from webcam images. It runs on a scheduled basis (every 5 minutes) to process pending GIF creation requests.

## Project Structure

```
lambda-function/
├── src/
│   ├── Function.cs                 # Main Lambda handler
│   ├── Models/                     # Data models
│   │   ├── GifResults.cs
│   │   ├── GifUploadRequest.cs
│   │   ├── GifUploadResponse.cs
│   │   ├── ImageBulkRequest.cs
│   │   └── ImageBulkResponse.cs
│   └── aws-lambda-gif-generator.csproj
├── ffmpeg-layer/                   # FFmpeg binaries for Lambda Layer
│   ├── bin/                        # (to be created)
│   │   ├── ffmpeg                  # (to be downloaded)
│   │   └── ffprobe                 # (to be downloaded)
│   └── README.md
├── template.yaml                   # SAM deployment template
└── README.md
```

## Features

- **Scheduled Execution**: Runs every 5 minutes via CloudWatch Events
- **FFmpeg Integration**: Uses Lambda Layer for FFmpeg binaries
- **Error Handling**: Continues processing if individual GIFs fail
- **Logging**: Comprehensive CloudWatch logging
- **Minimal AWS Dependencies**: Only uses Lambda and CloudWatch Events

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **SAM CLI** for deployment
3. **.NET 8 SDK** for building the function

## FFmpeg Setup Options

The Lambda function requires FFmpeg to create GIFs. Choose one of these options:

### Option 1: Use Public FFmpeg Layer (Recommended)

Find a public FFmpeg layer in your AWS region:
1. Go to AWS Lambda Console → Layers
2. Search for "ffmpeg" in public layers
3. Copy the layer ARN for your region
4. Update `template.yaml`:

```yaml
Layers:
  - arn:aws:lambda:YOUR-REGION:ACCOUNT:layer:ffmpeg:VERSION
```

### Option 2: Deploy Without FFmpeg (Will Fail at Runtime)

The current template has no FFmpeg layer configured. The function will deploy but fail when trying to create GIFs.

### Option 3: Bundle FFmpeg in Deployment Package

1. Download FFmpeg static binary for Amazon Linux 2
2. Place in `src/` directory before building
3. Update Function.cs to look for bundled binary

## Setup Instructions

### 1. Build the Function

```bash
cd src
dotnet build
```

### 2. Deploy with SAM

```bash
# Build the SAM application
sam build

# Deploy (first time - guided)
sam deploy --guided

# Subsequent deployments
sam deploy
```

### 4. Monitor Execution

- Check CloudWatch Logs for the Lambda function
- Monitor CloudWatch Events for scheduled triggers
- View Lambda metrics in AWS Console

## Configuration

### Environment Variables

The function uses hardcoded API endpoints. To make them configurable, add environment variables to `template.yaml`:

```yaml
Environment:
  Variables:
    API_BASE_URL: "https://nps-webcam-animation-generator.abvaden801.workers.dev"
```

### Schedule Modification

To change the execution schedule, modify the `Schedule` property in `template.yaml`:

```yaml
Schedule: rate(10 minutes)  # Run every 10 minutes
# or
Schedule: cron(0 */6 * * ? *)  # Run every 6 hours
```

## Function Behavior

1. **Fetch Pending GIFs**: Calls `/gifs/to-create` endpoint
2. **Process Each GIF**:
   - Downloads base64 image data via `/images/bulk`
   - Saves images to `/tmp` directory
   - Creates GIF using FFmpeg (4-second duration)
   - Uploads GIF via `/gifs/upload`
   - Cleans up temporary files
3. **Error Handling**: Logs errors but continues processing remaining GIFs
4. **Returns Summary**: Reports success/error counts

## Lambda Configuration

- **Runtime**: .NET 8
- **Memory**: 1024 MB
- **Timeout**: 15 minutes (maximum)
- **Architecture**: x86_64

## Troubleshooting

### Common Issues

1. **FFmpeg Not Found**
   - Ensure FFmpeg binaries are in `ffmpeg-layer/bin/`
   - Check layer is properly referenced in template.yaml

2. **Timeout Errors**
   - Increase memory allocation (more memory = faster processing)
   - Consider processing fewer GIFs per execution

3. **Storage Limits**
   - Lambda `/tmp` directory has 512MB limit
   - Function cleans up files after each GIF

### Logs

Check CloudWatch Logs for detailed execution information:
```bash
sam logs -n GifGeneratorFunction --tail
```

## Cost Considerations

- **Lambda Execution**: Charged per request and duration
- **CloudWatch Events**: Minimal cost for scheduled triggers
- **CloudWatch Logs**: Storage and ingestion costs
- **Data Transfer**: Outbound data transfer costs

## Security

The function requires minimal permissions:
- CloudWatch Logs (for logging)
- No additional AWS service permissions needed

## Differences from Console App

1. **Logging**: Uses CloudWatch instead of Console.WriteLine
2. **File System**: Uses `/tmp` instead of current directory
3. **Error Handling**: Continues processing on individual failures
4. **Scheduling**: Automated via CloudWatch Events
5. **FFmpeg**: Uses Lambda Layer instead of system PATH
