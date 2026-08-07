using System.Text.RegularExpressions;

namespace Loopr.Api.Storage;

public sealed record TrackAudioObjectKeyInput(
    string ProjectId,
    string SessionId,
    string TrackId,
    string? Extension = null
);

public static class AudioObjectKeys
{
    public const string DefaultTrackAudioExtension = "m4a";

    public static string BuildTrackAudioObjectKey(TrackAudioObjectKeyInput input)
    {
        var extension = NormalizeAudioExtension(
            input.Extension ?? DefaultTrackAudioExtension
        );

        return string.Join(
            "/",
            [
                "projects",
                EncodeS3KeySegment(input.ProjectId),
                "sessions",
                EncodeS3KeySegment(input.SessionId),
                "tracks",
                $"{EncodeS3KeySegment(input.TrackId)}.{extension}",
            ]
        );
    }

    public static string BuildTrackAudioObjectPrefix(string projectId, string sessionId)
    {
        return string.Join(
            "/",
            [
                "projects",
                EncodeS3KeySegment(projectId),
                "sessions",
                EncodeS3KeySegment(sessionId),
                "tracks",
            ]
        );
    }

    private static string EncodeS3KeySegment(string segment)
    {
        var trimmedSegment = segment.Trim();

        if (string.IsNullOrEmpty(trimmedSegment))
        {
            throw new InvalidOperationException("S3 object key segments must not be empty.");
        }

        return Uri.EscapeDataString(trimmedSegment);
    }

    private static string NormalizeAudioExtension(string extension)
    {
        var normalizedExtension = extension.Trim().TrimStart('.').ToLowerInvariant();

        if (!Regex.IsMatch(normalizedExtension, "^[a-z0-9]+$"))
        {
            throw new InvalidOperationException(
                "Audio file extension must be alphanumeric."
            );
        }

        return normalizedExtension;
    }
}
