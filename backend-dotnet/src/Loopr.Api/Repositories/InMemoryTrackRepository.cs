using Loopr.Api.Domain;

namespace Loopr.Api.Repositories;

public sealed class InMemoryTrackRepository : ITrackRepository
{
    private readonly Dictionary<string, LoopTrackMetadata> tracks = new(StringComparer.Ordinal);
    private readonly object syncRoot = new();

    public Task<IReadOnlyList<LoopTrackMetadata>> ListAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            return Task.FromResult<IReadOnlyList<LoopTrackMetadata>>(
                tracks.Values.OrderByDescending(track => track.UpdatedAt).ToArray()
            );
        }
    }

    public Task<LoopTrackMetadata?> GetByIdAsync(
        string trackId,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            tracks.TryGetValue(trackId, out var track);

            return Task.FromResult(track);
        }
    }

    public Task<LoopTrackMetadata> CreateAsync(
        LoopTrackMetadata track,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            tracks[track.Id] = track;
        }

        return Task.FromResult(track);
    }

    public Task ResetAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            tracks.Clear();
        }

        return Task.CompletedTask;
    }
}
