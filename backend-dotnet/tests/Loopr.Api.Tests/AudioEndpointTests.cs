using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Loopr.Api.Services;
using Loopr.Api.Tests.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Loopr.Api.Tests;

public sealed class AudioEndpointTests(ApiTestFactory factory) : IClassFixture<ApiTestFactory>
{
    [Fact]
    public async Task CreateUploadUrlReturnsUploadEnvelope()
    {
        var signer = new RecordingAudioUploadUrlSigner("https://signed.example/upload");
        using var appFactory = CreateFactoryWithSigner(signer);
        using var client = appFactory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/audio/upload-url",
            new
            {
                projectId = "project-1",
                sessionId = "session-1",
                trackId = "track-1",
                contentType = "audio/mp4",
            },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(
            "https://signed.example/upload",
            body.GetProperty("upload").GetProperty("uploadUrl").GetString()
        );
        Assert.Equal("PUT", body.GetProperty("upload").GetProperty("method").GetString());
        Assert.Equal(
            "loopr-audio-local",
            body.GetProperty("upload").GetProperty("s3Bucket").GetString()
        );
        Assert.Equal(
            "projects/project-1/sessions/session-1/tracks/track-1.m4a",
            body.GetProperty("upload").GetProperty("s3Key").GetString()
        );
        Assert.Equal(
            "audio/mp4",
            body.GetProperty("upload").GetProperty("contentType").GetString()
        );
        Assert.Equal(900, body.GetProperty("upload").GetProperty("expiresInSeconds").GetInt32());

        Assert.Single(signer.Requests);
    }

    [Fact]
    public async Task CreateUploadUrlValidationReturnsInvalidRequest()
    {
        var signer = new RecordingAudioUploadUrlSigner("https://signed.example/upload");
        using var appFactory = CreateFactoryWithSigner(signer);
        using var client = appFactory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/audio/upload-url",
            new
            {
                projectId = "",
                sessionId = "session-1",
                trackId = "track-1",
                contentType = "audio/mp4",
            },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertErrorCode(response, "invalid_request");
        Assert.Empty(signer.Requests);
    }

    [Fact]
    public async Task CreateUploadUrlRejectsUnsupportedAudioContentType()
    {
        var signer = new RecordingAudioUploadUrlSigner("https://signed.example/upload");
        using var appFactory = CreateFactoryWithSigner(signer);
        using var client = appFactory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/audio/upload-url",
            new
            {
                projectId = "project-1",
                sessionId = "session-1",
                trackId = "track-1",
                contentType = "application/octet-stream",
            },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertErrorCode(response, "invalid_request");
        Assert.Empty(signer.Requests);
    }

    [Fact]
    public async Task CreateUploadUrlReturnsInternalServerErrorWhenSigningFails()
    {
        using var appFactory = CreateFactoryWithSigner(new ThrowingAudioUploadUrlSigner());
        using var client = appFactory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/audio/upload-url",
            new
            {
                projectId = "project-1",
                sessionId = "session-1",
                trackId = "track-1",
                contentType = "audio/mp4",
            },
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        await AssertErrorCode(response, "internal_server_error");
    }

    private Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> CreateFactoryWithSigner(
        IAudioUploadUrlSigner signer
    )
    {
        return factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IAudioUploadUrlSigner>();
                services.AddSingleton(signer);
            });
        });
    }

    private static async Task AssertErrorCode(HttpResponseMessage response, string expectedCode)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: CancellationToken.None
        );

        Assert.Equal(expectedCode, body.GetProperty("error").GetProperty("code").GetString());
    }
}

internal sealed class ThrowingAudioUploadUrlSigner : IAudioUploadUrlSigner
{
    public string CreateUploadUrl(Amazon.S3.Model.GetPreSignedUrlRequest request)
    {
        throw new InvalidOperationException("S3 signing failed.");
    }
}
