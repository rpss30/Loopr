using Loopr.Api.Domain;

namespace Loopr.Api.Repositories;

public sealed class InMemorySessionRepository : ISessionRepository
{
    private readonly Dictionary<string, LoopSession> sessions = new(StringComparer.Ordinal);
    private readonly object syncRoot = new();

    public Task<IReadOnlyList<LoopSession>> ListAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            return Task.FromResult<IReadOnlyList<LoopSession>>(
                sessions.Values.OrderByDescending(session => session.UpdatedAt).ToArray()
            );
        }
    }

    public Task<LoopSession?> GetByIdAsync(string sessionId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            sessions.TryGetValue(sessionId, out var session);

            return Task.FromResult(session);
        }
    }

    public Task<LoopSession> CreateAsync(
        LoopSession session,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            sessions[session.Id] = session;
        }

        return Task.FromResult(session);
    }

    public Task ResetAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            sessions.Clear();
        }

        return Task.CompletedTask;
    }
}
