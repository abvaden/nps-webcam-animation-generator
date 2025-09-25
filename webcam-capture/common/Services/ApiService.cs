using System.Net.Http.Json;
using Common.Interfaces;
using Common.Models;

namespace Common.Services;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private readonly string _baseUrl;

    public ApiService(HttpClient httpClient, ILogger logger, string baseUrl = "https://nps-webcam-animation-generator.abvaden801.workers.dev")
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = baseUrl;
    }

    /// <summary>
    /// Gets the list of GIFs that need to be created
    /// </summary>
    /// <returns>GifRequest containing the list of GIFs to process</returns>
    public async Task<GifRequest?> GetGifsToCreateAsync()
    {
        try
        {
            _logger.LogInformation("Fetching GIFs to create from API");
            
            var response = await _httpClient.GetAsync($"{_baseUrl}/gifs/to-create");
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Failed to get GIFs to create. Status: {response.StatusCode}");
                return null;
            }

            var gifsResponse = await response.Content.ReadFromJsonAsync<GifRequest>();
            
            if (gifsResponse?.success == true)
            {
                _logger.LogInformation($"Successfully retrieved {gifsResponse.gifs.Count} GIFs to process");
            }
            else
            {
                _logger.LogInformation("No GIFs to create");
            }

            return gifsResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error fetching GIFs to create: {ex.Message}", ex);
            return null;
        }
    }

    /// <summary>
    /// Marks a GIF as complete after processing
    /// </summary>
    /// <param name="gifId">ID of the GIF to mark as complete</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> MarkGifCompleteAsync(int gifId)
    {
        try
        {
            _logger.LogInformation($"Marking GIF {gifId} as complete");
            
            var response = await _httpClient.PutAsync($"{_baseUrl}/gifs/{gifId}/complete", new StreamContent(Stream.Null));
            
            if (response.IsSuccessStatusCode)
            {
                var completionResponse = await response.Content.ReadFromJsonAsync<GifUploadResponse>();
                if (completionResponse?.success == true)
                {
                    _logger.LogInformation($"Successfully marked GIF {gifId} as complete: {completionResponse.message}");
                    return true;
                }
            }
            
            _logger.LogError($"Failed to mark GIF {gifId} as complete. Status: {response.StatusCode}");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error marking GIF {gifId} as complete: {ex.Message}", ex);
            return false;
        }
    }

    /// <summary>
    /// Legacy method: Uploads a GIF via API (used by lambda function before S3 migration)
    /// </summary>
    /// <param name="gifData">Base64 encoded GIF data</param>
    /// <param name="queueEntryId">Queue entry ID</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> UploadGifAsync(string gifData, int queueEntryId)
    {
        try
        {
            _logger.LogInformation($"Uploading GIF via API for queue entry {queueEntryId}");
            
            var uploadRequest = new GifUploadRequest
            {
                gif_data = gifData,
                queue_entry_id = queueEntryId,
            };
            
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/gifs/upload", uploadRequest);
            
            if (response.IsSuccessStatusCode)
            {
                var uploadResponse = await response.Content.ReadFromJsonAsync<GifUploadResponse>();
                if (uploadResponse?.success == true)
                {
                    _logger.LogInformation($"Successfully uploaded GIF for queue entry {queueEntryId}");
                    return true;
                }
            }
            
            _logger.LogError($"Failed to upload GIF for queue entry {queueEntryId}. Status: {response.StatusCode}");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error uploading GIF for queue entry {queueEntryId}: {ex.Message}", ex);
            return false;
        }
    }
}
