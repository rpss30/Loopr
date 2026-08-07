using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace Loopr.Api.Tests;

public sealed class E2EResetEndpointTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task ResetEndpointIsNotAvailableOutsideTestEnvironment()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsync("/api/v1/e2e/reset", null, CancellationToken.None);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await AssertErrorCode(response, "not_found");
    }

    [Fact]
    public async Task ResetEndpointClearsRepositoriesInTestEnvironment()
    {
        using var appFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Test");
        });
        using var client = appFactory.CreateClient();

        var project = await EndpointTestHelpers.CreateProjectAsync(client);
        var projectId = project.GetProperty("id").GetString()!;
        var session = await EndpointTestHelpers.CreateSessionAsync(client, projectId);
        var sessionId = session.GetProperty("id").GetString()!;
        await EndpointTestHelpers.CreateTrackAsync(client, projectId, sessionId);

        var response = await client.PostAsync("/api/v1/e2e/reset", null, CancellationToken.None);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await AssertCollectionIsEmpty(client, "/api/v1/tracks", "tracks");
        await AssertCollectionIsEmpty(client, "/api/v1/sessions", "sessions");
        await AssertCollectionIsEmpty(client, "/api/v1/projects", "projects");
    }

    private static async Task AssertCollectionIsEmpty(
        HttpClient client,
        string path,
        string propertyName
    )
    {
        var response = await client.GetAsync(path, CancellationToken.None);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Empty(body.GetProperty(propertyName).EnumerateArray());
    }

    private static async Task AssertErrorCode(HttpResponseMessage response, string expectedCode)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(expectedCode, body.GetProperty("error").GetProperty("code").GetString());
    }
}
