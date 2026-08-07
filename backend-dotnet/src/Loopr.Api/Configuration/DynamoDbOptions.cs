using System.ComponentModel.DataAnnotations;
using Amazon;
using Amazon.DynamoDBv2;

namespace Loopr.Api.Configuration;

public sealed class DynamoDbOptions
{
    public const string SectionName = "DynamoDb";

    [Required]
    [MinLength(1)]
    public string Region { get; set; } = "us-west-2";

    [Required]
    [MinLength(1)]
    public string MetadataTableName { get; set; } = "loopr-metadata";

    public string? Endpoint { get; set; }
}

public static class DynamoDbClientFactory
{
    public static AmazonDynamoDBConfig BuildConfig(DynamoDbOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.Endpoint))
        {
            return new AmazonDynamoDBConfig
            {
                ServiceURL = options.Endpoint,
                AuthenticationRegion = options.Region,
            };
        }

        return new AmazonDynamoDBConfig
        {
            RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region),
        };
    }

    public static IAmazonDynamoDB CreateClient(DynamoDbOptions options)
    {
        return new AmazonDynamoDBClient(BuildConfig(options));
    }
}
