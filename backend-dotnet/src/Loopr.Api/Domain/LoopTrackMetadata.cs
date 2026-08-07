namespace Loopr.Api.Domain;

public sealed record LoopTrackMetadata(
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
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
