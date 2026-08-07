using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public sealed class DynamoDbTrackRepositoryTests : TrackRepositoryContract
{
    protected override bool SupportsReset => false;

    protected override ITrackRepository CreateRepository()
    {
        return new DynamoDbTrackRepository(
            new FakeDynamoDbMetadataStore(),
            DynamoDbRepositoryTestOptions.Create()
        );
    }
}
