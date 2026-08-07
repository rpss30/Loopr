using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Loopr.Api.Tests;

public sealed class ProjectEndpointTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task ListProjectsReturnsEmptyList()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/projects", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Empty(body.GetProperty("projects").EnumerateArray());
    }

    [Fact]
    public async Task CreateProjectReturnsProjectEnvelope()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name = " Acoustic Loop ", bpm = 90 },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var project = body.GetProperty("project");

        Assert.False(string.IsNullOrWhiteSpace(project.GetProperty("id").GetString()));
        Assert.Equal("Acoustic Loop", project.GetProperty("name").GetString());
        Assert.Equal(90, project.GetProperty("bpm").GetInt32());
        Assert.Equal(0, project.GetProperty("trackCount").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(project.GetProperty("createdAt").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(project.GetProperty("updatedAt").GetString()));
    }

    [Fact]
    public async Task CreateProjectDefaultsBpmTo120()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name = "Untitled Loop" },
            CancellationToken.None
        );

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(120, body.GetProperty("project").GetProperty("bpm").GetInt32());
    }

    [Fact]
    public async Task ListProjectsReturnsNewestProjectFirst()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name = "First Loop", bpm = 90 },
            CancellationToken.None
        );
        await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name = "Second Loop", bpm = 100 },
            CancellationToken.None
        );

        var response = await client.GetAsync("/api/v1/projects", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var names = body.GetProperty("projects")
            .EnumerateArray()
            .Select(project => project.GetProperty("name").GetString())
            .ToArray();

        Assert.Equal(new[] { "Second Loop", "First Loop" }, names);
    }

    [Fact]
    public async Task GetProjectReturnsCreatedProject()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name = "Layered Idea", bpm = 110 },
            CancellationToken.None
        );
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var projectId = createBody.GetProperty("project").GetProperty("id").GetString();

        var response = await client.GetAsync($"/api/v1/projects/{projectId}", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(projectId, body.GetProperty("project").GetProperty("id").GetString());
    }

    [Fact]
    public async Task GetProjectReturnsProjectNotFound()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            "/api/v1/projects/missing-project",
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
    public async Task CreateProjectValidationReturnsInvalidRequest()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name = "   ", bpm = 300 },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var error = body.GetProperty("error");

        Assert.Equal("invalid_request", error.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(error.GetProperty("traceId").GetString()));
        Assert.Contains(
            error.GetProperty("details").EnumerateArray(),
            detail => detail.GetProperty("path").GetString() == "name"
        );
    }
}
