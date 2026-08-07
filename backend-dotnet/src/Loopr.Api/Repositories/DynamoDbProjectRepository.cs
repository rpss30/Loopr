using Amazon.DynamoDBv2.Model;
using Loopr.Api.Configuration;
using Loopr.Api.Domain;
using Loopr.Api.Serialization;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Repositories;

public sealed class DynamoDbProjectRepository(
    IDynamoDbMetadataStore store,
    IOptions<DynamoDbOptions> options
) : IProjectRepository
{
    private const string ProjectListIndexName = "gsi1";

    private readonly string tableName = options.Value.MetadataTableName;

    public async Task<IReadOnlyList<LoopProject>> ListAsync(
        CancellationToken cancellationToken
    )
    {
        var response = await store.QueryAsync(
            new QueryRequest
            {
                TableName = tableName,
                IndexName = ProjectListIndexName,
                KeyConditionExpression = "gsi1pk = :gsi1pk",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":gsi1pk"] = DynamoDbAttributeMap.String(
                        DynamoDbMetadataKeys.ProjectListPartitionKey
                    ),
                },
                ScanIndexForward = false,
            },
            cancellationToken
        );

        return (response.Items ?? []).Select(ToProject).ToArray();
    }

    public async Task<LoopProject?> GetByIdAsync(
        string projectId,
        CancellationToken cancellationToken
    )
    {
        var primaryKey = DynamoDbMetadataKeys.BuildProjectPrimaryKey(projectId);
        var response = await store.GetItemAsync(
            new GetItemRequest
            {
                TableName = tableName,
                Key = BuildPrimaryKeyAttributes(primaryKey),
            },
            cancellationToken
        );

        return response.Item is null || response.Item.Count == 0 ? null : ToProject(response.Item);
    }

    public async Task<LoopProject> CreateAsync(
        LoopProject project,
        CancellationToken cancellationToken
    )
    {
        await store.PutItemAsync(
            new PutItemRequest
            {
                TableName = tableName,
                Item = ToItem(project),
                ConditionExpression = "attribute_not_exists(pk)",
            },
            cancellationToken
        );

        return project;
    }

    public Task ResetAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        throw new NotSupportedException("DynamoDB project repository reset is not supported.");
    }

    private static Dictionary<string, AttributeValue> BuildPrimaryKeyAttributes(
        DynamoDbPrimaryKey primaryKey
    )
    {
        return new Dictionary<string, AttributeValue>
        {
            ["pk"] = DynamoDbAttributeMap.String(primaryKey.PartitionKey),
            ["sk"] = DynamoDbAttributeMap.String(primaryKey.SortKey),
        };
    }

    private static Dictionary<string, AttributeValue> ToItem(LoopProject project)
    {
        var primaryKey = DynamoDbMetadataKeys.BuildProjectPrimaryKey(project.Id);
        var projectListKey = DynamoDbMetadataKeys.BuildProjectListKey(
            IsoTimestamp.Format(project.UpdatedAt),
            project.Id
        );

        return new Dictionary<string, AttributeValue>
        {
            ["pk"] = DynamoDbAttributeMap.String(primaryKey.PartitionKey),
            ["sk"] = DynamoDbAttributeMap.String(primaryKey.SortKey),
            ["entityType"] = DynamoDbAttributeMap.String(DynamoDbEntityTypes.Project),
            ["projectId"] = DynamoDbAttributeMap.String(project.Id),
            ["name"] = DynamoDbAttributeMap.String(project.Name),
            ["bpm"] = DynamoDbAttributeMap.Number(project.Bpm),
            ["trackCount"] = DynamoDbAttributeMap.Number(project.TrackCount),
            ["createdAt"] = DynamoDbAttributeMap.Timestamp(project.CreatedAt),
            ["updatedAt"] = DynamoDbAttributeMap.Timestamp(project.UpdatedAt),
            ["gsi1pk"] = DynamoDbAttributeMap.String(projectListKey.PartitionKey),
            ["gsi1sk"] = DynamoDbAttributeMap.String(projectListKey.SortKey),
        };
    }

    private static LoopProject ToProject(Dictionary<string, AttributeValue> item)
    {
        return new LoopProject(
            DynamoDbAttributeMap.ReadString(item, "projectId"),
            DynamoDbAttributeMap.ReadString(item, "name"),
            DynamoDbAttributeMap.ReadInt(item, "bpm"),
            DynamoDbAttributeMap.ReadInt(item, "trackCount"),
            DynamoDbAttributeMap.ReadTimestamp(item, "createdAt"),
            DynamoDbAttributeMap.ReadTimestamp(item, "updatedAt")
        );
    }
}
