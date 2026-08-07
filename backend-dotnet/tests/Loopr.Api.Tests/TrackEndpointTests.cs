using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Loopr.Api.Tests;

public sealed class TrackEndpointTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task ListTracksReturnsEmptyList()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/tracks", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Empty(body.GetProperty("tracks").EnumerateArray());
    }

    [Fact]
    public async Task CreateTrackReturnsTrackEnvelope()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var (projectId, sessionId) = await CreateProjectAndSession(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(projectId, sessionId, name: " Guitar Layer ", volume: 0.75, isMuted: true),
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var track = body.GetProperty("track");

        Assert.False(string.IsNullOrWhiteSpace(track.GetProperty("id").GetString()));
        Assert.Equal(projectId, track.GetProperty("projectId").GetString());
        Assert.Equal(sessionId, track.GetProperty("sessionId").GetString());
        Assert.Equal("Guitar Layer", track.GetProperty("name").GetString());
        Assert.Equal(12_000, track.GetProperty("durationMs").GetInt32());
        Assert.Equal(0.75, track.GetProperty("volume").GetDouble());
        Assert.True(track.GetProperty("isMuted").GetBoolean());
        Assert.Equal("loopr-audio-local", track.GetProperty("s3Bucket").GetString());
        Assert.Equal("audio/mp4", track.GetProperty("contentType").GetString());
    }

    [Fact]
    public async Task CreateTrackDefaultsVolumeAndMuteState()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var (projectId, sessionId) = await CreateProjectAndSession(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(projectId, sessionId, volume: null, isMuted: null),
            CancellationToken.None
        );

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var track = body.GetProperty("track");

        Assert.Equal(1, track.GetProperty("volume").GetDouble());
        Assert.False(track.GetProperty("isMuted").GetBoolean());
    }

    [Fact]
    public async Task CreateTrackReturnsProjectNotFound()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload("missing-project", "missing-session"),
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await AssertErrorCode(response, "project_not_found");
    }

    [Fact]
    public async Task CreateTrackReturnsSessionNotFound()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var project = await EndpointTestHelpers.CreateProjectAsync(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(project.GetProperty("id").GetString()!, "missing-session"),
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await AssertErrorCode(response, "session_not_found");
    }

    [Fact]
    public async Task CreateTrackReturnsSessionProjectMismatch()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var firstProject = await EndpointTestHelpers.CreateProjectAsync(client, "First Project", 90);
        var secondProject = await EndpointTestHelpers.CreateProjectAsync(client, "Second Project", 120);
        var session = await EndpointTestHelpers.CreateSessionAsync(
            client,
            firstProject.GetProperty("id").GetString()!
        );

        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(
                secondProject.GetProperty("id").GetString()!,
                session.GetProperty("id").GetString()!
            ),
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertErrorCode(response, "session_project_mismatch");
    }

    [Fact]
    public async Task ListTracksReturnsNewestTrackFirst()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var (projectId, sessionId) = await CreateProjectAndSession(client);

        await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(projectId, sessionId, "First Layer"),
            CancellationToken.None
        );
        await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(projectId, sessionId, "Second Layer"),
            CancellationToken.None
        );

        var response = await client.GetAsync("/api/v1/tracks", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var names = body.GetProperty("tracks")
            .EnumerateArray()
            .Select(track => track.GetProperty("name").GetString())
            .ToArray();

        Assert.Equal(new[] { "Second Layer", "First Layer" }, names);
    }

    [Fact]
    public async Task GetTrackReturnsCreatedTrack()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();
        var (projectId, sessionId) = await CreateProjectAndSession(client);
        var createResponse = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            CreateTrackPayload(projectId, sessionId, "Lead Layer"),
            CancellationToken.None
        );
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );
        var trackId = createBody.GetProperty("track").GetProperty("id").GetString();

        var response = await client.GetAsync($"/api/v1/tracks/{trackId}", CancellationToken.None);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(trackId, body.GetProperty("track").GetProperty("id").GetString());
    }

    [Fact]
    public async Task GetTrackReturnsTrackNotFound()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/tracks/missing-track", CancellationToken.None);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await AssertErrorCode(response, "track_not_found");
    }

    [Fact]
    public async Task CreateTrackValidationReturnsInvalidRequest()
    {
        await factory.ResetRepositoriesAsync();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            new
            {
                projectId = "",
                sessionId = "",
                name = "",
                durationMs = -1,
                s3Bucket = "",
                s3Key = "",
                contentType = "text/plain",
            },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertErrorCode(response, "invalid_request");
    }

    private static async Task<(string ProjectId, string SessionId)> CreateProjectAndSession(
        HttpClient client
    )
    {
        var project = await EndpointTestHelpers.CreateProjectAsync(client);
        var projectId = project.GetProperty("id").GetString()!;
        var session = await EndpointTestHelpers.CreateSessionAsync(client, projectId);

        return (projectId, session.GetProperty("id").GetString()!);
    }

    private static object CreateTrackPayload(
        string projectId,
        string sessionId,
        string name = "Guitar Layer",
        double? volume = 0.75,
        bool? isMuted = false
    )
    {
        return new
        {
            projectId,
            sessionId,
            name,
            durationMs = 12_000,
            volume,
            isMuted,
            s3Bucket = "loopr-audio-local",
            s3Key = $"projects/{projectId}/sessions/{sessionId}/tracks/track-1.m4a",
            contentType = "audio/mp4",
        };
    }

    private static async Task AssertErrorCode(HttpResponseMessage response, string expectedCode)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(expectedCode, body.GetProperty("error").GetProperty("code").GetString());
    }
}
