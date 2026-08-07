using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public sealed class InMemoryProjectRepositoryTests : ProjectRepositoryContract
{
    protected override IProjectRepository CreateRepository()
    {
        return new InMemoryProjectRepository();
    }
}
