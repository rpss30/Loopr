using System.Text.Json.Serialization;
using Amazon.DynamoDBv2;
using Loopr.Api.Errors;
using Loopr.Api.Repositories;
using Loopr.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

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

        services
            .AddOptions<DynamoDbOptions>()
            .Bind(configuration.GetSection(DynamoDbOptions.SectionName))
            .Configure(options =>
            {
                ApplyDynamoDbEnvironmentOverrides(configuration, options);
            })
            .ValidateDataAnnotations()
            .ValidateOnStart();

        AddRepositories(services, ResolvePersistenceDriver(configuration));
        services.AddScoped<ProjectService>();
        services.AddScoped<SessionService>();
        services.AddScoped<TrackService>();

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

        services.AddSingleton<IAmazonDynamoDB>(serviceProvider =>
            DynamoDbClientFactory.CreateClient(
                serviceProvider.GetRequiredService<IOptions<DynamoDbOptions>>().Value
            )
        );
        services.AddSingleton<IDynamoDbMetadataStore, DynamoDbMetadataStore>();
        services.AddSingleton<IProjectRepository, DynamoDbProjectRepository>();
        services.AddSingleton<ISessionRepository, DynamoDbSessionRepository>();
        services.AddSingleton<ITrackRepository, DynamoDbTrackRepository>();
    }

    private static string ResolvePersistenceDriver(IConfiguration configuration)
    {
        return configuration["PERSISTENCE_DRIVER"]
            ?? configuration[$"{PersistenceOptions.SectionName}:Driver"]
            ?? PersistenceDrivers.Memory;
    }

    private static void ApplyDynamoDbEnvironmentOverrides(
        IConfiguration configuration,
        DynamoDbOptions options
    )
    {
        options.Region = configuration["AWS_REGION"] ?? options.Region;
        options.MetadataTableName =
            configuration["DYNAMODB_METADATA_TABLE_NAME"] ?? options.MetadataTableName;
        options.Endpoint = EmptyToNull(configuration["DYNAMODB_ENDPOINT"] ?? options.Endpoint);
    }

    private static string? EmptyToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
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
