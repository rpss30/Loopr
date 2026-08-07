using Amazon.S3;
using Amazon.S3.Model;
using Loopr.Api.Configuration;
using Loopr.Api.Storage;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Services;

public sealed record CreateAudioUploadUrlInput(
    string ProjectId,
    string SessionId,
    string TrackId,
    string ContentType
);

public sealed record CreateAudioUploadUrlResult(
    string UploadUrl,
    string Method,
    string S3Bucket,
    string S3Key,
    string ContentType,
    int ExpiresInSeconds
);

public interface IAudioUploadUrlSigner
{
    string CreateUploadUrl(GetPreSignedUrlRequest request);
}

public sealed class S3AudioUploadUrlSigner(IAmazonS3 client) : IAudioUploadUrlSigner
{
    public string CreateUploadUrl(GetPreSignedUrlRequest request)
    {
        return client.GetPreSignedURL(request);
    }
}

public sealed class AudioUploadUrlService(
    IOptions<S3Options> options,
    IAudioUploadUrlSigner signer
)
{
    private const string UploadMethod = "PUT";

    public Task<CreateAudioUploadUrlResult> CreateUploadUrlAsync(
        CreateAudioUploadUrlInput input,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var s3Options = options.Value;
        var s3Key = AudioObjectKeys.BuildTrackAudioObjectKey(
            new TrackAudioObjectKeyInput(input.ProjectId, input.SessionId, input.TrackId)
        );
        var request = new GetPreSignedUrlRequest
        {
            BucketName = s3Options.AudioBucketName,
            Key = s3Key,
            ContentType = input.ContentType,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddSeconds(s3Options.PresignedUploadExpiresSeconds),
        };

        var uploadUrl = signer.CreateUploadUrl(request);

        return Task.FromResult(
            new CreateAudioUploadUrlResult(
                uploadUrl,
                UploadMethod,
                s3Options.AudioBucketName,
                s3Key,
                input.ContentType,
                s3Options.PresignedUploadExpiresSeconds
            )
        );
    }
}
