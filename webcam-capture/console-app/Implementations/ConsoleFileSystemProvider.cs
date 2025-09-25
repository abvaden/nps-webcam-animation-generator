using Common.Interfaces;

namespace ConsoleApp.Implementations;

public class ConsoleFileSystemProvider : IFileSystemProvider
{
    public string CreateTempDirectory(string identifier)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), identifier);
        Directory.CreateDirectory(tempDir);
        return tempDir;
    }

    public string GetOutputPath(string filename)
    {
        return Path.Combine(Directory.GetCurrentDirectory(), filename);
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
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Failed to cleanup path {path}: {ex.Message}");
        }
    }
}
