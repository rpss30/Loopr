namespace Loopr.Api.Repositories;

internal static class DynamoDbEntityTypes
{
    public const string Project = "PROJECT";
    public const string Session = "SESSION";
    public const string Track = "TRACK";
}

internal static class DynamoDbMetadataKeys
{
    public const string ProjectListPartitionKey = "PROJECTS";
    public const string MetadataSortKey = "METADATA";

    public static DynamoDbPrimaryKey BuildProjectPrimaryKey(string projectId)
    {
        return new DynamoDbPrimaryKey($"PROJECT#{projectId}", MetadataSortKey);
    }

    public static DynamoDbPrimaryKey BuildSessionPrimaryKey(
        string projectId,
        string sessionId
    )
    {
        return new DynamoDbPrimaryKey($"PROJECT#{projectId}", $"SESSION#{sessionId}");
    }

    public static DynamoDbPrimaryKey BuildTrackPrimaryKey(
        string projectId,
        string sessionId,
        string trackId
    )
    {
        return new DynamoDbPrimaryKey(
            $"PROJECT#{projectId}",
            $"SESSION#{sessionId}#TRACK#{trackId}"
        );
    }

    public static DynamoDbProjectListKey BuildProjectListKey(
        string updatedAt,
        string projectId
    )
    {
        return new DynamoDbProjectListKey(
            ProjectListPartitionKey,
            $"UPDATED_AT#{updatedAt}#PROJECT#{projectId}"
        );
    }

    public static DynamoDbLookupKey BuildSessionLookupKey(string sessionId)
    {
        return new DynamoDbLookupKey($"SESSION#{sessionId}", MetadataSortKey);
    }

    public static DynamoDbLookupKey BuildTrackLookupKey(string trackId)
    {
        return new DynamoDbLookupKey($"TRACK#{trackId}", MetadataSortKey);
    }
}

internal sealed record DynamoDbPrimaryKey(string PartitionKey, string SortKey);

internal sealed record DynamoDbProjectListKey(string PartitionKey, string SortKey);

internal sealed record DynamoDbLookupKey(string PartitionKey, string SortKey);
