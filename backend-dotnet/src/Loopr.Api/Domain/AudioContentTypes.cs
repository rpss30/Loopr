namespace Loopr.Api.Domain;

public static class AudioContentTypes
{
    public static readonly IReadOnlySet<string> Supported = new HashSet<string>(
        ["audio/mp4", "audio/m4a", "audio/x-m4a", "audio/wav"],
        StringComparer.Ordinal
    );
}
