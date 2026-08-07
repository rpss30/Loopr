using System.ComponentModel.DataAnnotations;

namespace Loopr.Api.Configuration;

public static class LooprCorsPolicy
{
    public const string Name = "loopr-cors";
}

public sealed class LooprCorsOptions
{
    public const string SectionName = "Cors";

    [MinLength(1)]
    public List<string> AllowedOrigins { get; set; } =
    [
        "http://localhost:8082",
        "http://127.0.0.1:8082",
    ];
}
