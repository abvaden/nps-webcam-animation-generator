namespace Common.Models;

public class Gif
{
    public int id { get; set; }
    public int webcamId { get; set; }
    public string referenceId { get; set; } = string.Empty;
    public string gifType { get; set; } = string.Empty;
    public DateTime scheduledTime { get; set; }
    public List<string> imageList { get; set; } = new();
    public string status { get; set; } = string.Empty;
    public string createdAt { get; set; } = string.Empty;
    public object? processedAt { get; set; }
    public object? errorMessage { get; set; }
    public string? gifStorageKey { get; set; }
}

public class GifRequest
{
    public bool success { get; set; }
    public int count { get; set; }
    public List<Gif> gifs { get; set; } = new();
}

public class GifUploadResponse
{
    public bool success { get; set; }
    public string message { get; set; } = string.Empty;
}
