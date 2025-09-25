using Common.Interfaces;

namespace AWSLambdaGifGenerator.Implementations;

public class LambdaFileSystemProvider : IFileSystemProvider
{
    public string CreateTempDirectory(string identifier)
    {
        var tempDir = Path.Combine("/tmp", identifier);
        Directory.CreateDirectory(tempDir);
        return tempDir;
    }

    public string GetOutputPath(string filename)
    {
        return Path.Combine("/tmp", filename);
    }

    public void CleanupPath(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
            else if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Ignore cleanup errors in Lambda environment
        }
    }
}
