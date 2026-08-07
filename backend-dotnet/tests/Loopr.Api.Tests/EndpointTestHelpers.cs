using System.Net.Http.Json;
using System.Text.Json;

namespace Loopr.Api.Tests;

internal static class EndpointTestHelpers
{
    public static async Task<JsonElement> CreateProjectAsync(
        HttpClient client,
        string name = "Acoustic Project",
        int bpm = 90
    )
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/projects",
            new { name, bpm },
            CancellationToken.None
        );
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        return body.GetProperty("project").Clone();
    }

    public static async Task<JsonElement> CreateSessionAsync(
        HttpClient client,
        string projectId,
        string name = "Verse Session",
        int bpm = 90
    )
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/sessions",
            new
            {
                projectId,
                name,
                bpm,
            },
            CancellationToken.None
        );
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        return body.GetProperty("session").Clone();
    }

    public static async Task<JsonElement> CreateTrackAsync(
        HttpClient client,
        string projectId,
        string sessionId,
        string name = "Guitar Layer"
    )
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/tracks",
            new
            {
                projectId,
                sessionId,
                name,
                durationMs = 12_000,
                volume = 0.75,
                isMuted = false,
                s3Bucket = "loopr-audio-local",
                s3Key = $"projects/{projectId}/sessions/{sessionId}/tracks/track-1.m4a",
                contentType = "audio/mp4",
            },
            CancellationToken.None
        );
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        return body.GetProperty("track").Clone();
    }
}
