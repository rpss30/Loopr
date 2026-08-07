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
}
