namespace Loopr.Api.Domain;

public sealed record LoopSession(
    string Id,
    string ProjectId,
    string Name,
    int Bpm,
    int TrackCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
