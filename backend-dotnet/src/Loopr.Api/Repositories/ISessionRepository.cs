using Loopr.Api.Domain;

namespace Loopr.Api.Repositories;

public interface ISessionRepository
{
    Task<IReadOnlyList<LoopSession>> ListAsync(CancellationToken cancellationToken);

    Task<LoopSession?> GetByIdAsync(string sessionId, CancellationToken cancellationToken);

    Task<LoopSession> CreateAsync(LoopSession session, CancellationToken cancellationToken);

    Task ResetAsync(CancellationToken cancellationToken);
}
