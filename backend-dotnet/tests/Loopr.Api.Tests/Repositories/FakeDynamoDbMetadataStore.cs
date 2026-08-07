using Amazon.DynamoDBv2.Model;
using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

internal sealed class FakeDynamoDbMetadataStore : IDynamoDbMetadataStore
{
    private readonly Dictionary<(string PartitionKey, string SortKey), Dictionary<string, AttributeValue>> items = new();

    public Task<GetItemResponse> GetItemAsync(
        GetItemRequest request,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var key = ReadPrimaryKey(request.Key);
        items.TryGetValue(key, out var item);

        return Task.FromResult(
            new GetItemResponse
            {
                Item = item is null ? new Dictionary<string, AttributeValue>() : CopyItem(item),
            }
        );
    }

    public Task<PutItemResponse> PutItemAsync(
        PutItemRequest request,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var key = ReadPrimaryKey(request.Item);

        if (
            IsCreateOnlyCondition(request.ConditionExpression)
            && items.ContainsKey(key)
        )
        {
            throw new ConditionalCheckFailedException("item already exists");
        }

        items[key] = CopyItem(request.Item);

        return Task.FromResult(new PutItemResponse());
    }

    public Task<QueryResponse> QueryAsync(
        QueryRequest request,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var matches = request.IndexName switch
        {
            "gsi1" => QueryProjectList(request),
            "gsi2" => QueryLookupIndex(request),
            _ => QueryPrimaryIndex(request),
        };

        if (request.Limit is > 0)
        {
            matches = matches.Take(request.Limit.Value);
        }

        return Task.FromResult(new QueryResponse { Items = matches.Select(CopyItem).ToList() });
    }

    public Task<ScanResponse> ScanAsync(
        ScanRequest request,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var entityType = ReadExpressionValue(request, ":entityType");
        var matches = items.Values.Where(item =>
            string.Equals(ReadString(item, "entityType"), entityType, StringComparison.Ordinal)
        );

        return Task.FromResult(new ScanResponse { Items = matches.Select(CopyItem).ToList() });
    }

    private IEnumerable<Dictionary<string, AttributeValue>> QueryProjectList(
        QueryRequest request
    )
    {
        var gsi1pk = ReadExpressionValue(request, ":gsi1pk");
        var matches = items.Values.Where(item =>
            string.Equals(ReadString(item, "gsi1pk"), gsi1pk, StringComparison.Ordinal)
        );

        matches = request.ScanIndexForward == false
            ? matches.OrderByDescending(item => ReadString(item, "gsi1sk"))
            : matches.OrderBy(item => ReadString(item, "gsi1sk"));

        return matches;
    }

    private IEnumerable<Dictionary<string, AttributeValue>> QueryLookupIndex(
        QueryRequest request
    )
    {
        var gsi2pk = ReadExpressionValue(request, ":gsi2pk");
        var gsi2sk = ReadExpressionValue(request, ":gsi2sk");

        return items.Values.Where(item =>
            string.Equals(ReadString(item, "gsi2pk"), gsi2pk, StringComparison.Ordinal)
            && string.Equals(ReadString(item, "gsi2sk"), gsi2sk, StringComparison.Ordinal)
        );
    }

    private IEnumerable<Dictionary<string, AttributeValue>> QueryPrimaryIndex(
        QueryRequest request
    )
    {
        var partitionKey = ReadExpressionValue(request, ":pk");
        var sortKeyPrefix = ReadExpressionValue(request, ":skPrefix");

        return items.Values.Where(item =>
            string.Equals(ReadString(item, "pk"), partitionKey, StringComparison.Ordinal)
            && ReadString(item, "sk").StartsWith(sortKeyPrefix, StringComparison.Ordinal)
        );
    }

    private static (string PartitionKey, string SortKey) ReadPrimaryKey(
        Dictionary<string, AttributeValue> item
    )
    {
        return (ReadString(item, "pk"), ReadString(item, "sk"));
    }

    private static bool IsCreateOnlyCondition(string? conditionExpression)
    {
        return conditionExpression?.Contains("attribute_not_exists", StringComparison.Ordinal)
            == true;
    }

    private static string ReadExpressionValue(QueryRequest request, string name)
    {
        return request.ExpressionAttributeValues[name].S ?? "";
    }

    private static string ReadExpressionValue(ScanRequest request, string name)
    {
        return request.ExpressionAttributeValues[name].S ?? "";
    }

    private static string ReadString(
        Dictionary<string, AttributeValue> item,
        string attributeName
    )
    {
        return item.TryGetValue(attributeName, out var attributeValue)
            ? attributeValue.S ?? ""
            : "";
    }

    private static Dictionary<string, AttributeValue> CopyItem(
        Dictionary<string, AttributeValue> item
    )
    {
        return item.ToDictionary(
            entry => entry.Key,
            entry => CopyAttributeValue(entry.Value),
            StringComparer.Ordinal
        );
    }

    private static AttributeValue CopyAttributeValue(AttributeValue value)
    {
        return new AttributeValue
        {
            S = value.S,
            N = value.N,
            BOOL = value.BOOL,
        };
    }
}
