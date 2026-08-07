using Loopr.Api.Contracts;
using Loopr.Api.Domain;
using Loopr.Api.Repositories;

namespace Loopr.Api.Services;

public enum CreateTrackStatus
{
    Created,
    ProjectNotFound,
    SessionNotFound,
    SessionProjectMismatch,
}

public sealed record CreateTrackResult(CreateTrackStatus Status, LoopTrackMetadata? Track);

public sealed class TrackService(
    ITrackRepository trackRepository,
    IProjectRepository projectRepository,
    ISessionRepository sessionRepository
)
{
    public async Task<IReadOnlyList<LoopTrackMetadata>> ListTracksAsync(
        CancellationToken cancellationToken
    )
    {
        return await trackRepository.ListAsync(cancellationToken);
    }

    public async Task<LoopTrackMetadata?> GetTrackByIdAsync(
        string trackId,
        CancellationToken cancellationToken
    )
    {
        return await trackRepository.GetByIdAsync(trackId, cancellationToken);
    }

    public async Task<CreateTrackResult> CreateTrackAsync(
        CreateTrackRequest request,
        CancellationToken cancellationToken
    )
    {
        var projectId = request.ProjectId.Trim();
        var sessionId = request.SessionId.Trim();
        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken);

        if (project is null)
        {
            return new CreateTrackResult(CreateTrackStatus.ProjectNotFound, null);
        }

        var session = await sessionRepository.GetByIdAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return new CreateTrackResult(CreateTrackStatus.SessionNotFound, null);
        }

        if (!string.Equals(session.ProjectId, projectId, StringComparison.Ordinal))
        {
            return new CreateTrackResult(CreateTrackStatus.SessionProjectMismatch, null);
        }

        var now = DateTimeOffset.UtcNow;
        var track = new LoopTrackMetadata(
            Guid.NewGuid().ToString(),
            projectId,
            sessionId,
            request.Name.Trim(),
            request.DurationMs,
            request.Volume ?? 1,
            request.IsMuted ?? false,
            request.S3Bucket.Trim(),
            request.S3Key.Trim(),
            request.ContentType,
            now,
            now
        );

        var createdTrack = await trackRepository.CreateAsync(track, cancellationToken);

        return new CreateTrackResult(CreateTrackStatus.Created, createdTrack);
    }
}
