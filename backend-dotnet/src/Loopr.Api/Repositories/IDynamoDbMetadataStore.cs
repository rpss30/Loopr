using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace Loopr.Api.Repositories;

public interface IDynamoDbMetadataStore
{
    Task<GetItemResponse> GetItemAsync(GetItemRequest request, CancellationToken cancellationToken);

    Task<PutItemResponse> PutItemAsync(PutItemRequest request, CancellationToken cancellationToken);

    Task<QueryResponse> QueryAsync(QueryRequest request, CancellationToken cancellationToken);

    Task<ScanResponse> ScanAsync(ScanRequest request, CancellationToken cancellationToken);
}

public sealed class DynamoDbMetadataStore(IAmazonDynamoDB client) : IDynamoDbMetadataStore
{
    public async Task<GetItemResponse> GetItemAsync(
        GetItemRequest request,
        CancellationToken cancellationToken
    )
    {
        return await client.GetItemAsync(request, cancellationToken);
    }

    public async Task<PutItemResponse> PutItemAsync(
        PutItemRequest request,
        CancellationToken cancellationToken
    )
    {
        return await client.PutItemAsync(request, cancellationToken);
    }

    public async Task<QueryResponse> QueryAsync(
        QueryRequest request,
        CancellationToken cancellationToken
    )
    {
        return await client.QueryAsync(request, cancellationToken);
    }

    public async Task<ScanResponse> ScanAsync(
        ScanRequest request,
        CancellationToken cancellationToken
    )
    {
        return await client.ScanAsync(request, cancellationToken);
    }
}
