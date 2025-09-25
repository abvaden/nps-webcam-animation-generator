namespace Common.Interfaces;

public interface IFileSystemProvider
{
    /// <summary>
    /// Creates a temporary directory for processing files
    /// </summary>
    /// <param name="identifier">Unique identifier for the directory</param>
    /// <returns>Path to the created temporary directory</returns>
    string CreateTempDirectory(string identifier);

    /// <summary>
    /// Gets the output path for a generated file
    /// </summary>
    /// <param name="filename">Name of the file</param>
    /// <returns>Full path where the file should be saved</returns>
    string GetOutputPath(string filename);

    /// <summary>
    /// Cleans up temporary directories and files
    /// </summary>
    /// <param name="path">Path to clean up</param>
    void CleanupPath(string path);
}
