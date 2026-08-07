using Loopr.Api.Domain;

namespace Loopr.Api.Repositories;

public interface ITrackRepository
{
    Task<IReadOnlyList<LoopTrackMetadata>> ListAsync(CancellationToken cancellationToken);

    Task<LoopTrackMetadata?> GetByIdAsync(string trackId, CancellationToken cancellationToken);

    Task<LoopTrackMetadata> CreateAsync(
        LoopTrackMetadata track,
        CancellationToken cancellationToken
    );

    Task ResetAsync(CancellationToken cancellationToken);
}
