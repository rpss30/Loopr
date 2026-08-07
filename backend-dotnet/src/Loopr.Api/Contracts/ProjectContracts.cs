using System.ComponentModel.DataAnnotations;
using Loopr.Api.Domain;
using Loopr.Api.Serialization;
using Loopr.Api.Validation;

namespace Loopr.Api.Contracts;

public sealed class CreateProjectRequest
{
    [NonEmptyTrimmedString(80)]
    public string Name { get; init; } = string.Empty;

    [Range(40, 240)]
    public int? Bpm { get; init; }
}

public sealed record ProjectResponse(
    string Id,
    string Name,
    int Bpm,
    int TrackCount,
    string CreatedAt,
    string UpdatedAt
)
{
    public static ProjectResponse FromDomain(LoopProject project)
    {
        return new ProjectResponse(
            project.Id,
            project.Name,
            project.Bpm,
            project.TrackCount,
            IsoTimestamp.Format(project.CreatedAt),
            IsoTimestamp.Format(project.UpdatedAt)
        );
    }
}

public sealed record ProjectEnvelope(ProjectResponse Project);

public sealed record ProjectsEnvelope(IReadOnlyList<ProjectResponse> Projects);
