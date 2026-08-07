using Loopr.Api.Domain;
using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public abstract class SessionRepositoryContract
{
    protected virtual bool SupportsReset => true;

    protected abstract ISessionRepository CreateRepository();

    [Fact]
    public async Task ListAsyncReturnsSessionsByUpdatedAtDescending()
    {
        var repository = CreateRepository();
        var earlier = CreateSession("session-1", "First", DateTimeOffset.Parse("2026-01-01T00:00:00Z"));
        var later = CreateSession("session-2", "Second", DateTimeOffset.Parse("2026-01-02T00:00:00Z"));

        await repository.CreateAsync(earlier, CancellationToken.None);
        await repository.CreateAsync(later, CancellationToken.None);

        var sessions = await repository.ListAsync(CancellationToken.None);

        Assert.Collection(
            sessions,
            session => Assert.Equal("session-2", session.Id),
            session => Assert.Equal("session-1", session.Id)
        );
    }

    [Fact]
    public async Task GetByIdAsyncReturnsCreatedSession()
    {
        var repository = CreateRepository();
        var session = CreateSession("session-1", "Verse Loop", DateTimeOffset.Parse("2026-01-01T00:00:00Z"));

        await repository.CreateAsync(session, CancellationToken.None);

        var result = await repository.GetByIdAsync(session.Id, CancellationToken.None);

        Assert.Equal(session, result);
    }

    [Fact]
    public async Task ResetAsyncClearsSessions()
    {
        var repository = CreateRepository();

        await repository.CreateAsync(
            CreateSession("session-1", "Verse Loop", DateTimeOffset.Parse("2026-01-01T00:00:00Z")),
            CancellationToken.None
        );

        if (!SupportsReset)
        {
            await Assert.ThrowsAsync<NotSupportedException>(() =>
                repository.ResetAsync(CancellationToken.None)
            );
            return;
        }

        await repository.ResetAsync(CancellationToken.None);

        var sessions = await repository.ListAsync(CancellationToken.None);

        Assert.Empty(sessions);
    }

    private static LoopSession CreateSession(
        string id,
        string name,
        DateTimeOffset updatedAt
    )
    {
        return new LoopSession(id, "project-1", name, 120, 0, updatedAt.AddMinutes(-5), updatedAt);
    }
}
