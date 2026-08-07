using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public sealed class DynamoDbSessionRepositoryTests : SessionRepositoryContract
{
    protected override bool SupportsReset => false;

    protected override ISessionRepository CreateRepository()
    {
        return new DynamoDbSessionRepository(
            new FakeDynamoDbMetadataStore(),
            DynamoDbRepositoryTestOptions.Create()
        );
    }
}
