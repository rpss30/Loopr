using Loopr.Api.Contracts;
using Loopr.Api.Domain;
using Loopr.Api.Repositories;

namespace Loopr.Api.Services;

public enum CreateSessionStatus
{
    Created,
    ProjectNotFound,
}

public sealed record CreateSessionResult(CreateSessionStatus Status, LoopSession? Session);

public sealed class SessionService(
    ISessionRepository sessionRepository,
    IProjectRepository projectRepository
)
{
    public async Task<IReadOnlyList<LoopSession>> ListSessionsAsync(
        CancellationToken cancellationToken
    )
    {
        return await sessionRepository.ListAsync(cancellationToken);
    }

    public async Task<LoopSession?> GetSessionByIdAsync(
        string sessionId,
        CancellationToken cancellationToken
    )
    {
        return await sessionRepository.GetByIdAsync(sessionId, cancellationToken);
    }

    public async Task<CreateSessionResult> CreateSessionAsync(
        CreateSessionRequest request,
        CancellationToken cancellationToken
    )
    {
        var projectId = request.ProjectId.Trim();
        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken);

        if (project is null)
        {
            return new CreateSessionResult(CreateSessionStatus.ProjectNotFound, null);
        }

        var now = DateTimeOffset.UtcNow;
        var session = new LoopSession(
            Guid.NewGuid().ToString(),
            projectId,
            request.Name.Trim(),
            request.Bpm ?? 120,
            0,
            now,
            now
        );

        var createdSession = await sessionRepository.CreateAsync(session, cancellationToken);

        return new CreateSessionResult(CreateSessionStatus.Created, createdSession);
    }
}
