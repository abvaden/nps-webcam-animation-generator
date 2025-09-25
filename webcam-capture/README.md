# NPW Webcam GIF Generator

This project contains both a console application and an AWS Lambda function for generating GIFs from webcam images.

## Project Structure

```
npw-webcam-gif-generator/
├── console-app/                    # Original console application
│   ├── Program.cs
│   ├── *.cs (model files)
│   ├── npw-webcam-gif-generator.csproj
│   └── npw-webcam-gif-generator.sln
├── lambda-function/                # AWS Lambda function
│   ├── src/
│   │   ├── Function.cs
│   │   ├── Models/
│   │   └── aws-lambda-gif-generator.csproj
│   ├── ffmpeg-layer/
│   ├── template.yaml
│   └── README.md
└── README.md
```

## Applications

### Console Application (`console-app/`)

The original console application that:
- Fetches pending GIF creation requests from an API
- Downloads base64 image data
- Creates GIFs using FFMpegCore
- Uploads completed GIFs back to the API

**Usage:**
```bash
cd console-app
dotnet run
```

### AWS Lambda Function (`lambda-function/`)

An AWS Lambda function that duplicates the console application functionality with:
- **Scheduled execution** every 5 minutes via CloudWatch Events
- **FFmpeg integration** using Lambda Layers
- **Cloud-native logging** via CloudWatch
- **Error resilience** - continues processing if individual GIFs fail

**Deployment:**
```bash
cd lambda-function
sam build
sam deploy --guided
```

## Key Differences

| Feature | Console App | Lambda Function |
|---------|-------------|-----------------|
| **Execution** | Manual/scheduled externally | CloudWatch Events (5 min) |
| **Logging** | Console output | CloudWatch Logs |
| **File System** | Current directory | `/tmp` directory |
| **FFmpeg** | System PATH | Lambda Layer |
| **Error Handling** | Stops on error | Continues processing |
| **Scaling** | Single instance | Auto-scaling |

## API Endpoints

Both applications interact with the same API endpoints:
- `GET /gifs/to-create` - Fetch pending GIF requests
- `POST /images/bulk` - Download image data
- `POST /gifs/upload` - Upload completed GIFs

## Requirements

### Console Application
- .NET 9.0
- FFMpegCore package
- FFmpeg installed on system PATH

### Lambda Function
- .NET 8.0
- AWS CLI and SAM CLI
- FFmpeg binaries for Lambda Layer

## Getting Started

1. **For Console Application:**
   ```bash
   cd console-app
   dotnet restore
   dotnet run
   ```

2. **For Lambda Function:**
   ```bash
   cd lambda-function
   # Setup FFmpeg layer (see lambda-function/ffmpeg-layer/README.md)
   sam build
   sam deploy --guided
   ```

## Documentation

- [Console App Details](console-app/) - Original application code
- [Lambda Function Details](lambda-function/README.md) - AWS Lambda implementation
- [FFmpeg Layer Setup](lambda-function/ffmpeg-layer/README.md) - Lambda Layer configuration

## Architecture

Both applications follow the same processing flow:

1. **Fetch** pending GIF creation requests
2. **Download** base64 image data for each request
3. **Process** images into 4-second GIF files
4. **Upload** completed GIFs to the API
5. **Clean up** temporary files

The Lambda function adds cloud-native features like scheduled execution, centralized logging, and automatic scaling.
