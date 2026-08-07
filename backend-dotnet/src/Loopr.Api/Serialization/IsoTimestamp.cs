using System.Globalization;

namespace Loopr.Api.Serialization;

public static class IsoTimestamp
{
    private const string NodeCompatibleFormat = "yyyy-MM-dd'T'HH:mm:ss.fff'Z'";

    public static string Format(DateTimeOffset timestamp)
    {
        return timestamp.UtcDateTime.ToString(NodeCompatibleFormat, CultureInfo.InvariantCulture);
    }
}
