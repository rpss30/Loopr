namespace Loopr.Api.Domain;

public sealed record LoopProject(
    string Id,
    string Name,
    int Bpm,
    int TrackCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
