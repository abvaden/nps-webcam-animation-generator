namespace Common.Models;

// Models for API interactions that are still needed
public class GifUploadRequest
{
    public int queue_entry_id { get; set; }
    public string gif_data { get; set; } = string.Empty;
    public GifUploadMetadata? metadata { get; set; }
}

public class GifUploadMetadata
{
    public int frame_count { get; set; }
    public int duration { get; set; }
    public int file_size { get; set; }
}

// Legacy models - these will be removed once we fully migrate to S3
public class BulkImageRequest
{
    public List<string> images { get; set; } = new();
    public ImageFormat format { get; set; }
    public bool include_metadata { get; set; }
}

public class BulkImageResponse
{
    public bool success { get; set; }
    public int count { get; set; }
    public List<ImageResult> images { get; set; } = new();
    public List<ImageError> failed { get; set; } = new();
}

public class ImageResult
{
    public string key { get; set; } = string.Empty;
    public string? data { get; set; }
    public int? size { get; set; }
    public string? lastModified { get; set; }
    public string? contentType { get; set; }
    public bool? exists { get; set; }
}

public class ImageError
{
    public string key { get; set; } = string.Empty;
    public string error { get; set; } = string.Empty;
}

public enum ImageFormat
{
    base64,
    metadata,
    urls,
}
