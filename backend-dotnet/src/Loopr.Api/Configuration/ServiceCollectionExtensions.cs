using System.Text.Json.Serialization;
using Loopr.Api.Errors;
using Loopr.Api.Repositories;
using Loopr.Api.Services;
using Microsoft.AspNetCore.Mvc;

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
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var details = context.ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .SelectMany(entry =>
                        entry.Value!.Errors.Select(error => new ApiValidationError(
                            ToCamelCasePath(entry.Key),
                            error.ErrorMessage
                        ))
                    )
                    .ToArray();

                return new BadRequestObjectResult(
                    new ApiErrorEnvelope(
                        new ApiError(
                            "invalid_request",
                            "Request body failed validation.",
                            context.HttpContext.TraceIdentifier,
                            details
                        )
                    )
                );
            };
        });

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
        services.AddScoped<ProjectService>();

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

    private static string ToCamelCasePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return path;
        }

        return string.Join(
            ".",
            path.Split('.').Select(segment =>
                string.IsNullOrEmpty(segment)
                    ? segment
                    : char.ToLowerInvariant(segment[0]) + segment[1..]
            )
        );
    }
}
