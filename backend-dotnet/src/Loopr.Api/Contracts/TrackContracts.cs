using System.ComponentModel.DataAnnotations;
using Loopr.Api.Domain;
using Loopr.Api.Serialization;
using Loopr.Api.Validation;

namespace Loopr.Api.Contracts;

public sealed class CreateTrackRequest
{
    [NonEmptyTrimmedString]
    public string ProjectId { get; init; } = string.Empty;

    [NonEmptyTrimmedString]
    public string SessionId { get; init; } = string.Empty;

    [NonEmptyTrimmedString(80)]
    public string Name { get; init; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int DurationMs { get; init; }

    [Range(0, 1)]
    public double? Volume { get; init; }

    public bool? IsMuted { get; init; }

    [NonEmptyTrimmedString]
    public string S3Bucket { get; init; } = string.Empty;

    [NonEmptyTrimmedString]
    public string S3Key { get; init; } = string.Empty;

    [SupportedAudioContentType]
    public string ContentType { get; init; } = string.Empty;
}

public sealed record TrackResponse(
    string Id,
    string ProjectId,
    string SessionId,
    string Name,
    int DurationMs,
    double Volume,
    bool IsMuted,
    string S3Bucket,
    string S3Key,
    string ContentType,
    string CreatedAt,
    string UpdatedAt
)
{
    public static TrackResponse FromDomain(LoopTrackMetadata track)
    {
        return new TrackResponse(
            track.Id,
            track.ProjectId,
            track.SessionId,
            track.Name,
            track.DurationMs,
            track.Volume,
            track.IsMuted,
            track.S3Bucket,
            track.S3Key,
            track.ContentType,
            IsoTimestamp.Format(track.CreatedAt),
            IsoTimestamp.Format(track.UpdatedAt)
        );
    }
}

public sealed record TrackEnvelope(TrackResponse Track);

public sealed record TracksEnvelope(IReadOnlyList<TrackResponse> Tracks);
