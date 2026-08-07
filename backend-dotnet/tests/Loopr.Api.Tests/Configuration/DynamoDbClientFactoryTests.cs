using Loopr.Api.Configuration;

namespace Loopr.Api.Tests.Configuration;

public sealed class DynamoDbClientFactoryTests
{
    [Fact]
    public void BuildConfigUsesAwsRegionWhenEndpointIsNotConfigured()
    {
        var config = DynamoDbClientFactory.BuildConfig(
            new DynamoDbOptions
            {
                Region = "us-west-2",
                MetadataTableName = "loopr-metadata",
            }
        );

        Assert.Equal("us-west-2", config.RegionEndpoint.SystemName);
        Assert.Null(config.ServiceURL);
    }

    [Fact]
    public void BuildConfigUsesServiceUrlForDynamoDbLocal()
    {
        var config = DynamoDbClientFactory.BuildConfig(
            new DynamoDbOptions
            {
                Region = "us-west-2",
                MetadataTableName = "loopr-metadata",
                Endpoint = "http://127.0.0.1:8001",
            }
        );

        Assert.Equal("http://127.0.0.1:8001/", config.ServiceURL);
        Assert.Equal("us-west-2", config.AuthenticationRegion);
    }
}
