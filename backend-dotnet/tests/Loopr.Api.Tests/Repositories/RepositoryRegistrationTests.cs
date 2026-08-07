using Loopr.Api.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace Loopr.Api.Tests.Repositories;

public sealed class RepositoryRegistrationTests(ApiTestFactory factory)
    : IClassFixture<ApiTestFactory>
{
    [Fact]
    public void RegistersInMemoryRepositoriesByDefault()
    {
        using var scope = factory.Services.CreateScope();

        Assert.IsType<InMemoryProjectRepository>(
            scope.ServiceProvider.GetRequiredService<IProjectRepository>()
        );
        Assert.IsType<InMemorySessionRepository>(
            scope.ServiceProvider.GetRequiredService<ISessionRepository>()
        );
        Assert.IsType<InMemoryTrackRepository>(
            scope.ServiceProvider.GetRequiredService<ITrackRepository>()
        );
    }
}
