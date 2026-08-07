using Loopr.Api.Domain;
using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public abstract class TrackRepositoryContract
{
    protected abstract ITrackRepository CreateRepository();

    [Fact]
    public async Task ListAsyncReturnsTracksByUpdatedAtDescending()
    {
        var repository = CreateRepository();
        var earlier = CreateTrack("track-1", "First", DateTimeOffset.Parse("2026-01-01T00:00:00Z"));
        var later = CreateTrack("track-2", "Second", DateTimeOffset.Parse("2026-01-02T00:00:00Z"));

        await repository.CreateAsync(earlier, CancellationToken.None);
        await repository.CreateAsync(later, CancellationToken.None);

        var tracks = await repository.ListAsync(CancellationToken.None);

        Assert.Collection(
            tracks,
            track => Assert.Equal("track-2", track.Id),
            track => Assert.Equal("track-1", track.Id)
        );
    }

    [Fact]
    public async Task GetByIdAsyncReturnsCreatedTrack()
    {
        var repository = CreateRepository();
        var track = CreateTrack("track-1", "Guitar Layer", DateTimeOffset.Parse("2026-01-01T00:00:00Z"));

        await repository.CreateAsync(track, CancellationToken.None);

        var result = await repository.GetByIdAsync(track.Id, CancellationToken.None);

        Assert.Equal(track, result);
    }

    [Fact]
    public async Task ResetAsyncClearsTracks()
    {
        var repository = CreateRepository();

        await repository.CreateAsync(
            CreateTrack("track-1", "Guitar Layer", DateTimeOffset.Parse("2026-01-01T00:00:00Z")),
            CancellationToken.None
        );
        await repository.ResetAsync(CancellationToken.None);

        var tracks = await repository.ListAsync(CancellationToken.None);

        Assert.Empty(tracks);
    }

    private static LoopTrackMetadata CreateTrack(
        string id,
        string name,
        DateTimeOffset updatedAt
    )
    {
        return new LoopTrackMetadata(
            id,
            "project-1",
            "session-1",
            name,
            12_000,
            1,
            false,
            "loopr-audio-local",
            $"projects/project-1/sessions/session-1/tracks/{id}.m4a",
            "audio/mp4",
            updatedAt.AddMinutes(-5),
            updatedAt
        );
    }
}
