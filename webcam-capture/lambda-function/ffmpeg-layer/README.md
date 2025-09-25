# FFmpeg Lambda Layer Setup

This directory should contain the FFmpeg binaries for the AWS Lambda Layer.

## Setup Instructions

1. **Download FFmpeg Static Build for Amazon Linux 2:**
   - Go to https://johnvansickle.com/ffmpeg/
   - Download the "release" build for "amd64" (64-bit)
   - Or use this direct command:
   ```bash
   wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
   ```

2. **Extract and Organize:**
   ```bash
   # Extract the downloaded file
   tar -xf ffmpeg-release-amd64-static.tar.xz
   
   # Create the bin directory structure
   mkdir -p bin
   
   # Copy the ffmpeg and ffprobe binaries
   cp ffmpeg-*-amd64-static/ffmpeg bin/
   cp ffmpeg-*-amd64-static/ffprobe bin/
   
   # Make them executable
   chmod +x bin/ffmpeg
   chmod +x bin/ffprobe
   ```

3. **Final Structure:**
   ```
   ffmpeg-layer/
   ├── bin/
   │   ├── ffmpeg
   │   └── ffprobe
   └── README.md
   ```

## Alternative: Pre-built Layer

If you prefer to use a pre-built FFmpeg layer, you can:

1. Use an existing public layer ARN (search AWS Lambda Layers for "ffmpeg")
2. Update the `template.yaml` to reference the public layer ARN instead of creating a new one

Example:
```yaml
Layers:
  - arn:aws:lambda:us-east-1:123456789012:layer:ffmpeg:1
```

## Notes

- The Lambda Layer will make FFmpeg available at `/opt/bin/ffmpeg` in the Lambda runtime
- The Function.cs file is configured to look for FFmpeg at this path
- Total layer size should be under 250MB (unzipped)
