using System.ComponentModel.DataAnnotations;

namespace Loopr.Api.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NonEmptyTrimmedStringAttribute(int maxLength = 0) : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is not string text)
        {
            return false;
        }

        var trimmed = text.Trim();

        if (trimmed.Length == 0)
        {
            return false;
        }

        return maxLength <= 0 || trimmed.Length <= maxLength;
    }

    public override string FormatErrorMessage(string name)
    {
        return maxLength > 0
            ? $"{name} must be a non-empty string with at most {maxLength} characters."
            : $"{name} must be a non-empty string.";
    }
}
