using System.ComponentModel.DataAnnotations;
using Loopr.Api.Services;
using Loopr.Api.Validation;

namespace Loopr.Api.Contracts;

public sealed class CreateAudioUploadUrlRequest
{
    [NonEmptyTrimmedString]
    public string ProjectId { get; init; } = string.Empty;

    [NonEmptyTrimmedString]
    public string SessionId { get; init; } = string.Empty;

    [NonEmptyTrimmedString]
    public string TrackId { get; init; } = string.Empty;

    [SupportedAudioContentType]
    public string ContentType { get; init; } = string.Empty;
}

public sealed record AudioUploadResponse(
    string UploadUrl,
    string Method,
    string S3Bucket,
    string S3Key,
    string ContentType,
    int ExpiresInSeconds
)
{
    public static AudioUploadResponse FromResult(CreateAudioUploadUrlResult result)
    {
        return new AudioUploadResponse(
            result.UploadUrl,
            result.Method,
            result.S3Bucket,
            result.S3Key,
            result.ContentType,
            result.ExpiresInSeconds
        );
    }
}

public sealed record AudioUploadEnvelope(AudioUploadResponse Upload);
