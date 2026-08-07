using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public sealed class InMemoryTrackRepositoryTests : TrackRepositoryContract
{
    protected override ITrackRepository CreateRepository()
    {
        return new InMemoryTrackRepository();
    }
}
