using System.Net;
using Loopr.Api.Configuration;
using Microsoft.Extensions.Configuration;

namespace Loopr.Api.Tests;

public sealed class CorsTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task AllowsDefaultExpoWebOrigin()
    {
        using var client = factory.CreateClient();

        var response = await SendPreflightAsync(client, "http://127.0.0.1:8082");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(
            response.Headers,
            header =>
                string.Equals(
                    header.Key,
                    "Access-Control-Allow-Origin",
                    StringComparison.OrdinalIgnoreCase
                )
                && header.Value.Contains("http://127.0.0.1:8082")
        );
    }

    [Fact]
    public async Task AllowsOriginsFromEnvironmentOverride()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["CORS_ALLOWED_ORIGINS"] =
                        "http://192.168.1.20:8082, http://localhost:19006",
                }
            )
            .Build();
        var options = new LooprCorsOptions();

        ServiceCollectionExtensions.ApplyCorsEnvironmentOverrides(configuration, options);

        Assert.Equal(
            ["http://192.168.1.20:8082", "http://localhost:19006"],
            options.AllowedOrigins
        );
    }

    [Fact]
    public async Task DoesNotAllowUnconfiguredOrigins()
    {
        using var client = factory.CreateClient();

        var response = await SendPreflightAsync(client, "http://example.invalid");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.DoesNotContain(
            response.Headers,
            header =>
                string.Equals(
                    header.Key,
                    "Access-Control-Allow-Origin",
                    StringComparison.OrdinalIgnoreCase
                )
        );
    }

    private static async Task<HttpResponseMessage> SendPreflightAsync(
        HttpClient client,
        string origin
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/projects");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");

        return await client.SendAsync(request, CancellationToken.None);
    }
}
