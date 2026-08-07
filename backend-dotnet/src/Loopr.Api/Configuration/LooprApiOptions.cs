using System.ComponentModel.DataAnnotations;

namespace Loopr.Api.Configuration;

public sealed class LooprApiOptions
{
    public const string SectionName = "Loopr";

    [Required]
    [MinLength(1)]
    public string ServiceName { get; init; } = "loopr-api";
}
