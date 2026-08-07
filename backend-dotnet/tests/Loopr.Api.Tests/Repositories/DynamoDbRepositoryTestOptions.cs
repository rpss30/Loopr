using Loopr.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Tests.Repositories;

internal static class DynamoDbRepositoryTestOptions
{
    public static IOptions<DynamoDbOptions> Create()
    {
        return Options.Create(
            new DynamoDbOptions
            {
                Region = "us-west-2",
                MetadataTableName = "loopr-test-metadata",
            }
        );
    }
}
