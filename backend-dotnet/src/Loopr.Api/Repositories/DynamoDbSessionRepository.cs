using Amazon.DynamoDBv2.Model;
using Loopr.Api.Configuration;
using Loopr.Api.Domain;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Repositories;

public sealed class DynamoDbSessionRepository(
    IDynamoDbMetadataStore store,
    IOptions<DynamoDbOptions> options
) : ISessionRepository
{
    private const string LookupIndexName = "gsi2";

    private readonly string tableName = options.Value.MetadataTableName;

    public async Task<IReadOnlyList<LoopSession>> ListAsync(
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
                    [":entityType"] = DynamoDbAttributeMap.String(DynamoDbEntityTypes.Session),
                },
            },
            cancellationToken
        );

        return (response.Items ?? [])
            .Select(ToSession)
            .OrderByDescending(session => session.UpdatedAt)
            .ToArray();
    }

    public async Task<LoopSession?> GetByIdAsync(
        string sessionId,
        CancellationToken cancellationToken
    )
    {
        var lookupKey = DynamoDbMetadataKeys.BuildSessionLookupKey(sessionId);
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

        return item is null ? null : ToSession(item);
    }

    public async Task<LoopSession> CreateAsync(
        LoopSession session,
        CancellationToken cancellationToken
    )
    {
        await store.PutItemAsync(
            new PutItemRequest
            {
                TableName = tableName,
                Item = ToItem(session),
                ConditionExpression = "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            },
            cancellationToken
        );

        return session;
    }

    public Task ResetAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        throw new NotSupportedException("DynamoDB session repository reset is not supported.");
    }

    private static Dictionary<string, AttributeValue> ToItem(LoopSession session)
    {
        var primaryKey = DynamoDbMetadataKeys.BuildSessionPrimaryKey(
            session.ProjectId,
            session.Id
        );
        var lookupKey = DynamoDbMetadataKeys.BuildSessionLookupKey(session.Id);

        return new Dictionary<string, AttributeValue>
        {
            ["pk"] = DynamoDbAttributeMap.String(primaryKey.PartitionKey),
            ["sk"] = DynamoDbAttributeMap.String(primaryKey.SortKey),
            ["entityType"] = DynamoDbAttributeMap.String(DynamoDbEntityTypes.Session),
            ["projectId"] = DynamoDbAttributeMap.String(session.ProjectId),
            ["sessionId"] = DynamoDbAttributeMap.String(session.Id),
            ["name"] = DynamoDbAttributeMap.String(session.Name),
            ["bpm"] = DynamoDbAttributeMap.Number(session.Bpm),
            ["trackCount"] = DynamoDbAttributeMap.Number(session.TrackCount),
            ["createdAt"] = DynamoDbAttributeMap.Timestamp(session.CreatedAt),
            ["updatedAt"] = DynamoDbAttributeMap.Timestamp(session.UpdatedAt),
            ["gsi2pk"] = DynamoDbAttributeMap.String(lookupKey.PartitionKey),
            ["gsi2sk"] = DynamoDbAttributeMap.String(lookupKey.SortKey),
        };
    }

    private static LoopSession ToSession(Dictionary<string, AttributeValue> item)
    {
        return new LoopSession(
            DynamoDbAttributeMap.ReadString(item, "sessionId"),
            DynamoDbAttributeMap.ReadString(item, "projectId"),
            DynamoDbAttributeMap.ReadString(item, "name"),
            DynamoDbAttributeMap.ReadInt(item, "bpm"),
            DynamoDbAttributeMap.ReadInt(item, "trackCount"),
            DynamoDbAttributeMap.ReadTimestamp(item, "createdAt"),
            DynamoDbAttributeMap.ReadTimestamp(item, "updatedAt")
        );
    }
}
