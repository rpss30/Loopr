using Amazon.S3;
using Amazon.S3.Model;
using Loopr.Api.Configuration;
using Loopr.Api.Services;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Tests.Services;

public sealed class AudioUploadUrlServiceTests
{
    [Fact]
    public async Task CreateUploadUrlReturnsPresignedS3PutTarget()
    {
        var signer = new RecordingAudioUploadUrlSigner("https://signed.example/upload");
        var service = new AudioUploadUrlService(
            Options.Create(
                new S3Options
                {
                    Region = "us-west-2",
                    AudioBucketName = "loopr-test-audio",
                    PresignedUploadExpiresSeconds = 600,
                }
            ),
            signer
        );

        var beforeSigning = DateTime.UtcNow.AddSeconds(599);
        var result = await service.CreateUploadUrlAsync(
            new CreateAudioUploadUrlInput(
                "project-1",
                "session-1",
                "track-1",
                "audio/mp4"
            ),
            CancellationToken.None
        );
        var afterSigning = DateTime.UtcNow.AddSeconds(601);

        Assert.Equal(
            new CreateAudioUploadUrlResult(
                "https://signed.example/upload",
                "PUT",
                "loopr-test-audio",
                "projects/project-1/sessions/session-1/tracks/track-1.m4a",
                "audio/mp4",
                600
            ),
            result
        );

        var request = Assert.Single(signer.Requests);
        Assert.Equal("loopr-test-audio", request.BucketName);
        Assert.Equal("projects/project-1/sessions/session-1/tracks/track-1.m4a", request.Key);
        Assert.Equal("audio/mp4", request.ContentType);
        Assert.Equal(HttpVerb.PUT, request.Verb);
        Assert.True(request.Expires.HasValue);
        Assert.InRange(request.Expires.Value, beforeSigning, afterSigning);
    }

    [Fact]
    public async Task CreateUploadUrlUrlEncodesObjectKeySegmentsBeforeSigning()
    {
        var signer = new RecordingAudioUploadUrlSigner("https://signed.example/upload");
        var service = new AudioUploadUrlService(
            Options.Create(
                new S3Options
                {
                    Region = "us-west-2",
                    AudioBucketName = "loopr-test-audio",
                    PresignedUploadExpiresSeconds = 900,
                }
            ),
            signer
        );

        await service.CreateUploadUrlAsync(
            new CreateAudioUploadUrlInput(
                " project 1 ",
                "session/1",
                "track 1",
                "audio/mp4"
            ),
            CancellationToken.None
        );

        var request = Assert.Single(signer.Requests);
        Assert.Equal("projects/project%201/sessions/session%2F1/tracks/track%201.m4a", request.Key);
    }
}

internal sealed class RecordingAudioUploadUrlSigner(string uploadUrl) : IAudioUploadUrlSigner
{
    public List<GetPreSignedUrlRequest> Requests { get; } = [];

    public string CreateUploadUrl(GetPreSignedUrlRequest request)
    {
        Requests.Add(request);

        return uploadUrl;
    }
}
