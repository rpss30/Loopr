using Amazon.DynamoDBv2;
using Loopr.Api.Configuration;
using Loopr.Api.Repositories;
using Microsoft.Extensions.Configuration;
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

    [Fact]
    public void RegistersDynamoDbRepositoriesWhenConfigured()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Persistence:Driver"] = "dynamodb",
                    ["DynamoDb:Region"] = "us-west-2",
                    ["DynamoDb:MetadataTableName"] = "loopr-test-metadata",
                }
            )
            .Build();

        services.AddLooprApiFoundation(configuration);

        using var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetRequiredService<IAmazonDynamoDB>());
        Assert.IsType<DynamoDbMetadataStore>(
            provider.GetRequiredService<IDynamoDbMetadataStore>()
        );
        Assert.IsType<DynamoDbProjectRepository>(
            provider.GetRequiredService<IProjectRepository>()
        );
        Assert.IsType<DynamoDbSessionRepository>(
            provider.GetRequiredService<ISessionRepository>()
        );
        Assert.IsType<DynamoDbTrackRepository>(
            provider.GetRequiredService<ITrackRepository>()
        );
    }
}
