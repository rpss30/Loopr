using System.ComponentModel.DataAnnotations;
using Loopr.Api.Domain;
using Loopr.Api.Serialization;
using Loopr.Api.Validation;

namespace Loopr.Api.Contracts;

public sealed class CreateSessionRequest
{
    [NonEmptyTrimmedString]
    public string ProjectId { get; init; } = string.Empty;

    [NonEmptyTrimmedString(80)]
    public string Name { get; init; } = string.Empty;

    [Range(40, 240)]
    public int? Bpm { get; init; }
}

public sealed record SessionResponse(
    string Id,
    string ProjectId,
    string Name,
    int Bpm,
    int TrackCount,
    string CreatedAt,
    string UpdatedAt
)
{
    public static SessionResponse FromDomain(LoopSession session)
    {
        return new SessionResponse(
            session.Id,
            session.ProjectId,
            session.Name,
            session.Bpm,
            session.TrackCount,
            IsoTimestamp.Format(session.CreatedAt),
            IsoTimestamp.Format(session.UpdatedAt)
        );
    }
}

public sealed record SessionEnvelope(SessionResponse Session);

public sealed record SessionsEnvelope(IReadOnlyList<SessionResponse> Sessions);
