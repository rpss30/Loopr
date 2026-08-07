using Loopr.Api.Contracts;
using Loopr.Api.Domain;
using Loopr.Api.Repositories;

namespace Loopr.Api.Services;

public sealed class ProjectService(IProjectRepository repository)
{
    public async Task<IReadOnlyList<LoopProject>> ListProjectsAsync(
        CancellationToken cancellationToken
    )
    {
        return await repository.ListAsync(cancellationToken);
    }

    public async Task<LoopProject?> GetProjectByIdAsync(
        string projectId,
        CancellationToken cancellationToken
    )
    {
        return await repository.GetByIdAsync(projectId, cancellationToken);
    }

    public async Task<LoopProject> CreateProjectAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken
    )
    {
        var now = DateTimeOffset.UtcNow;
        var project = new LoopProject(
            Guid.NewGuid().ToString(),
            request.Name.Trim(),
            request.Bpm ?? 120,
            0,
            now,
            now
        );

        return await repository.CreateAsync(project, cancellationToken);
    }
}
