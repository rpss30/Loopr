using Loopr.Api.Domain;

namespace Loopr.Api.Repositories;

public interface IProjectRepository
{
    Task<IReadOnlyList<LoopProject>> ListAsync(CancellationToken cancellationToken);

    Task<LoopProject?> GetByIdAsync(string projectId, CancellationToken cancellationToken);

    Task<LoopProject> CreateAsync(LoopProject project, CancellationToken cancellationToken);

    Task ResetAsync(CancellationToken cancellationToken);
}
