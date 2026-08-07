using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Loopr.Api.Tests;

public sealed class SessionEndpointTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task ListSessionsReturnsEmptyList()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/sessions", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Empty(body.GetProperty("sessions").EnumerateArray());
    }

    [Fact]
    public async Task CreateSessionReturnsSessionEnvelope()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var project = await EndpointTestHelpers.CreateProjectAsync(client);
        var projectId = project.GetProperty("id").GetString();

        var response = await client.PostAsJsonAsync(
            "/api/v1/sessions",
            new { projectId, name = " Verse Loop ", bpm = 90 },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var session = body.GetProperty("session");

        Assert.False(string.IsNullOrWhiteSpace(session.GetProperty("id").GetString()));
        Assert.Equal(projectId, session.GetProperty("projectId").GetString());
        Assert.Equal("Verse Loop", session.GetProperty("name").GetString());
        Assert.Equal(90, session.GetProperty("bpm").GetInt32());
        Assert.Equal(0, session.GetProperty("trackCount").GetInt32());
    }

    [Fact]
    public async Task CreateSessionDefaultsBpmTo120()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var project = await EndpointTestHelpers.CreateProjectAsync(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/sessions",
            new
            {
                projectId = project.GetProperty("id").GetString(),
                name = "Untitled Session",
            },
            CancellationToken.None
        );

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(120, body.GetProperty("session").GetProperty("bpm").GetInt32());
    }

    [Fact]
    public async Task CreateSessionReturnsProjectNotFound()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/sessions",
            new { projectId = "missing-project", name = "Verse Loop", bpm = 90 },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(
            "project_not_found",
            body.GetProperty("error").GetProperty("code").GetString()
        );
    }

    [Fact]
    public async Task ListSessionsReturnsNewestSessionFirst()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var project = await EndpointTestHelpers.CreateProjectAsync(client);
        var projectId = project.GetProperty("id").GetString()!;

        await EndpointTestHelpers.CreateSessionAsync(client, projectId, "First Session", 85);
        await EndpointTestHelpers.CreateSessionAsync(client, projectId, "Second Session", 100);

        var response = await client.GetAsync("/api/v1/sessions", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var names = body.GetProperty("sessions")
            .EnumerateArray()
            .Select(session => session.GetProperty("name").GetString())
            .ToArray();

        Assert.Equal(new[] { "Second Session", "First Session" }, names);
    }

    [Fact]
    public async Task GetSessionReturnsCreatedSession()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var project = await EndpointTestHelpers.CreateProjectAsync(client);
        var session = await EndpointTestHelpers.CreateSessionAsync(
            client,
            project.GetProperty("id").GetString()!
        );
        var sessionId = session.GetProperty("id").GetString();

        var response = await client.GetAsync($"/api/v1/sessions/{sessionId}", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(sessionId, body.GetProperty("session").GetProperty("id").GetString());
    }

    [Fact]
    public async Task GetSessionReturnsSessionNotFound()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            "/api/v1/sessions/missing-session",
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(
            "session_not_found",
            body.GetProperty("error").GetProperty("code").GetString()
        );
    }

    [Fact]
    public async Task CreateSessionValidationReturnsInvalidRequest()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/sessions",
            new { projectId = "", name = "   ", bpm = 300 },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(
            "invalid_request",
            body.GetProperty("error").GetProperty("code").GetString()
        );
    }
}
