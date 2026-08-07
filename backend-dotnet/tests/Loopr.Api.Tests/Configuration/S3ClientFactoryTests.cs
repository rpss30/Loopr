using Loopr.Api.Configuration;

namespace Loopr.Api.Tests.Configuration;

public sealed class S3ClientFactoryTests
{
    [Fact]
    public void BuildConfigUsesConfiguredAwsRegion()
    {
        var config = S3ClientFactory.BuildConfig(
            new S3Options
            {
                Region = "ca-central-1",
                AudioBucketName = "loopr-test-audio",
                PresignedUploadExpiresSeconds = 600,
            }
        );

        Assert.Equal("ca-central-1", config.RegionEndpoint.SystemName);
    }
}
