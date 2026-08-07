using Amazon.DynamoDBv2.Model;
using Loopr.Api.Configuration;
using Loopr.Api.Domain;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Repositories;

public sealed class DynamoDbTrackRepository(
    IDynamoDbMetadataStore store,
    IOptions<DynamoDbOptions> options
) : ITrackRepository
{
    private const string LookupIndexName = "gsi2";

    private readonly string tableName = options.Value.MetadataTableName;

    public async Task<IReadOnlyList<LoopTrackMetadata>> ListAsync(
        CancellationToken cancellationToken
    )
    {
        var response = await store.ScanAsync(
            new ScanRequest
            {
                TableName = tableName,
                FilterExpression = "entityType = :entityType",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":entityType"] = DynamoDbAttributeMap.String(DynamoDbEntityTypes.Track),
                },
            },
            cancellationToken
        );

        return (response.Items ?? [])
            .Select(ToTrack)
            .OrderByDescending(track => track.UpdatedAt)
            .ToArray();
    }

    public async Task<LoopTrackMetadata?> GetByIdAsync(
        string trackId,
        CancellationToken cancellationToken
    )
    {
        var lookupKey = DynamoDbMetadataKeys.BuildTrackLookupKey(trackId);
        var response = await store.QueryAsync(
            new QueryRequest
            {
                TableName = tableName,
                IndexName = LookupIndexName,
                KeyConditionExpression = "gsi2pk = :gsi2pk AND gsi2sk = :gsi2sk",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":gsi2pk"] = DynamoDbAttributeMap.String(lookupKey.PartitionKey),
                    [":gsi2sk"] = DynamoDbAttributeMap.String(lookupKey.SortKey),
                },
                Limit = 1,
            },
            cancellationToken
        );

        var item = (response.Items ?? []).FirstOrDefault();

        return item is null ? null : ToTrack(item);
    }

    public async Task<LoopTrackMetadata> CreateAsync(
        LoopTrackMetadata track,
        CancellationToken cancellationToken
    )
    {
        await store.PutItemAsync(
            new PutItemRequest
            {
                TableName = tableName,
                Item = ToItem(track),
                ConditionExpression = "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            },
            cancellationToken
        );

        return track;
    }

    public Task ResetAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        throw new NotSupportedException("DynamoDB track repository reset is not supported.");
    }

    private static Dictionary<string, AttributeValue> ToItem(LoopTrackMetadata track)
    {
        var primaryKey = DynamoDbMetadataKeys.BuildTrackPrimaryKey(
            track.ProjectId,
            track.SessionId,
            track.Id
        );
        var lookupKey = DynamoDbMetadataKeys.BuildTrackLookupKey(track.Id);

        return new Dictionary<string, AttributeValue>
        {
            ["pk"] = DynamoDbAttributeMap.String(primaryKey.PartitionKey),
            ["sk"] = DynamoDbAttributeMap.String(primaryKey.SortKey),
            ["entityType"] = DynamoDbAttributeMap.String(DynamoDbEntityTypes.Track),
            ["projectId"] = DynamoDbAttributeMap.String(track.ProjectId),
            ["sessionId"] = DynamoDbAttributeMap.String(track.SessionId),
            ["trackId"] = DynamoDbAttributeMap.String(track.Id),
            ["name"] = DynamoDbAttributeMap.String(track.Name),
            ["durationMs"] = DynamoDbAttributeMap.Number(track.DurationMs),
            ["volume"] = DynamoDbAttributeMap.Number(track.Volume),
            ["isMuted"] = DynamoDbAttributeMap.Boolean(track.IsMuted),
            ["s3Bucket"] = DynamoDbAttributeMap.String(track.S3Bucket),
            ["s3Key"] = DynamoDbAttributeMap.String(track.S3Key),
            ["contentType"] = DynamoDbAttributeMap.String(track.ContentType),
            ["createdAt"] = DynamoDbAttributeMap.Timestamp(track.CreatedAt),
            ["updatedAt"] = DynamoDbAttributeMap.Timestamp(track.UpdatedAt),
            ["gsi2pk"] = DynamoDbAttributeMap.String(lookupKey.PartitionKey),
            ["gsi2sk"] = DynamoDbAttributeMap.String(lookupKey.SortKey),
        };
    }

    private static LoopTrackMetadata ToTrack(Dictionary<string, AttributeValue> item)
    {
        return new LoopTrackMetadata(
            DynamoDbAttributeMap.ReadString(item, "trackId"),
            DynamoDbAttributeMap.ReadString(item, "projectId"),
            DynamoDbAttributeMap.ReadString(item, "sessionId"),
            DynamoDbAttributeMap.ReadString(item, "name"),
            DynamoDbAttributeMap.ReadInt(item, "durationMs"),
            DynamoDbAttributeMap.ReadDouble(item, "volume"),
            DynamoDbAttributeMap.ReadBoolean(item, "isMuted"),
            DynamoDbAttributeMap.ReadString(item, "s3Bucket"),
            DynamoDbAttributeMap.ReadString(item, "s3Key"),
            DynamoDbAttributeMap.ReadString(item, "contentType"),
            DynamoDbAttributeMap.ReadTimestamp(item, "createdAt"),
            DynamoDbAttributeMap.ReadTimestamp(item, "updatedAt")
        );
    }
}
