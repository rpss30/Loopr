using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public sealed class DynamoDbProjectRepositoryTests : ProjectRepositoryContract
{
    protected override bool SupportsReset => false;

    protected override IProjectRepository CreateRepository()
    {
        return new DynamoDbProjectRepository(
            new FakeDynamoDbMetadataStore(),
            DynamoDbRepositoryTestOptions.Create()
        );
    }
}
