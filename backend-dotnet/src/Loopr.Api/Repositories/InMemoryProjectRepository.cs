using Loopr.Api.Domain;

namespace Loopr.Api.Repositories;

public sealed class InMemoryProjectRepository : IProjectRepository
{
    private readonly Dictionary<string, LoopProject> projects = new(StringComparer.Ordinal);
    private readonly object syncRoot = new();

    public Task<IReadOnlyList<LoopProject>> ListAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            return Task.FromResult<IReadOnlyList<LoopProject>>(
                projects.Values.OrderByDescending(project => project.UpdatedAt).ToArray()
            );
        }
    }

    public Task<LoopProject?> GetByIdAsync(string projectId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            projects.TryGetValue(projectId, out var project);

            return Task.FromResult(project);
        }
    }

    public Task<LoopProject> CreateAsync(
        LoopProject project,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            projects[project.Id] = project;
        }

        return Task.FromResult(project);
    }

    public Task ResetAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            projects.Clear();
        }

        return Task.CompletedTask;
    }
}
