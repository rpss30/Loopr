using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public sealed class InMemorySessionRepositoryTests : SessionRepositoryContract
{
    protected override ISessionRepository CreateRepository()
    {
        return new InMemorySessionRepository();
    }
}
