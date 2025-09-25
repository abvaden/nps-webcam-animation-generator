public class DownSampleService
{
    public static IEnumerable<string> DeSample(List<string> initialFileSet, int totalImages)
    {
        var skip = (double)initialFileSet.Count / totalImages;

        var ret = 0;
        var i = 0.0;
        while (ret < totalImages)
        {
            yield return initialFileSet[(int)Math.Floor(i)];

            i += skip;
            ret++;
        }
    }
}