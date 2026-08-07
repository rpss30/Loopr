using System.Text.Json.Serialization;
using Loopr.Api.Repositories;

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

        services
            .AddOptions<PersistenceOptions>()
            .Bind(configuration.GetSection(PersistenceOptions.SectionName))
            .Configure(options =>
            {
                var legacyDriver = configuration["PERSISTENCE_DRIVER"];

                if (!string.IsNullOrWhiteSpace(legacyDriver))
                {
                    options.Driver = legacyDriver;
                }
            })
            .ValidateDataAnnotations()
            .Validate(options => PersistenceDrivers.IsSupported(options.Driver))
            .ValidateOnStart();

        AddRepositories(services, ResolvePersistenceDriver(configuration));

        return services;
    }

    private static void AddRepositories(IServiceCollection services, string driver)
    {
        if (string.Equals(driver, PersistenceDrivers.Memory, StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IProjectRepository, InMemoryProjectRepository>();
            services.AddSingleton<ISessionRepository, InMemorySessionRepository>();
            services.AddSingleton<ITrackRepository, InMemoryTrackRepository>();

            return;
        }

        throw new NotSupportedException(
            "DynamoDB persistence is not implemented in the ASP.NET Core backend yet."
        );
    }

    private static string ResolvePersistenceDriver(IConfiguration configuration)
    {
        return configuration["PERSISTENCE_DRIVER"]
            ?? configuration[$"{PersistenceOptions.SectionName}:Driver"]
            ?? PersistenceDrivers.Memory;
    }
}
