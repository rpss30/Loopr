using System.ComponentModel.DataAnnotations;

namespace Loopr.Api.Configuration;

public static class PersistenceDrivers
{
    public const string Memory = "memory";
    public const string DynamoDb = "dynamodb";

    public static bool IsSupported(string driver)
    {
        return string.Equals(driver, Memory, StringComparison.OrdinalIgnoreCase)
            || string.Equals(driver, DynamoDb, StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class PersistenceOptions
{
    public const string SectionName = "Persistence";

    [Required]
    public string Driver { get; set; } = PersistenceDrivers.Memory;
}
