using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Loopr.Api.Tests;

public sealed class FoundationTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task HealthEndpointReturnsNodeCompatiblePayload()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal("loopr-api", body.GetProperty("service").GetString());
    }

    [Fact]
    public async Task UnknownRoutesReturnStructuredErrorResponse()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            "/missing-route",
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var error = body.GetProperty("error");

        Assert.Equal("not_found", error.GetProperty("code").GetString());
        Assert.Equal(
            "Route GET /missing-route not found",
            error.GetProperty("message").GetString()
        );
        Assert.False(string.IsNullOrWhiteSpace(error.GetProperty("traceId").GetString()));
    }

    [Fact]
    public async Task DevelopmentEnvironmentExposesOpenApiDocument()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            "/openapi/v1.json",
            CancellationToken.None
        );

        response.EnsureSuccessStatusCode();
    }
}
