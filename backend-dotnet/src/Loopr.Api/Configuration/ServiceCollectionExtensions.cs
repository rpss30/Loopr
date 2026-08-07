using System.Text.Json.Serialization;

namespace Loopr.Api.Configuration;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddLooprApiFoundation(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services
            .AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.DefaultIgnoreCondition =
                    JsonIgnoreCondition.WhenWritingNull;
            });
        services.AddOpenApi();
        services.AddHealthChecks();

        services
            .AddOptions<LooprApiOptions>()
            .Bind(configuration.GetSection(LooprApiOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        return services;
    }
}
