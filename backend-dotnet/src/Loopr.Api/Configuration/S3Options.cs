using System.ComponentModel.DataAnnotations;
using Amazon;
using Amazon.S3;

namespace Loopr.Api.Configuration;

public sealed class S3Options
{
    public const string SectionName = "S3";

    [Required]
    [MinLength(1)]
    public string Region { get; set; } = "us-west-2";

    [Required]
    [MinLength(1)]
    public string AudioBucketName { get; set; } = "loopr-audio-local";

    [Range(1, 3600)]
    public int PresignedUploadExpiresSeconds { get; set; } = 900;
}

public static class S3ClientFactory
{
    public static AmazonS3Config BuildConfig(S3Options options)
    {
        return new AmazonS3Config
        {
            RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region),
        };
    }

    public static IAmazonS3 CreateClient(S3Options options)
    {
        return new AmazonS3Client(BuildConfig(options));
    }
}
