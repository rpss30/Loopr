using System.ComponentModel.DataAnnotations;
using Loopr.Api.Domain;

namespace Loopr.Api.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class SupportedAudioContentTypeAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        return value is string contentType && AudioContentTypes.Supported.Contains(contentType);
    }

    public override string FormatErrorMessage(string name)
    {
        return $"{name} must be one of: {string.Join(", ", AudioContentTypes.Supported)}.";
    }
}
