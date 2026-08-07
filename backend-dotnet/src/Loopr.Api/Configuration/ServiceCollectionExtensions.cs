using System.Text.Json.Serialization;
using Amazon.DynamoDBv2;
using Amazon.S3;
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
        var corsOptions = BuildCorsOptions(configuration);
        services.AddCors(options =>
        {
            options.AddPolicy(
                LooprCorsPolicy.Name,
                policy =>
                {
                    policy
                        .WithOrigins(corsOptions.AllowedOrigins.ToArray())
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
            );
        });
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
            .AddOptions<LooprCorsOptions>()
            .Bind(configuration.GetSection(LooprCorsOptions.SectionName))
            .Configure(options =>
            {
                ApplyCorsEnvironmentOverrides(configuration, options);
            })
            .ValidateDataAnnotations()
            .Validate(options => options.AllowedOrigins.All(origin => Uri.IsWellFormedUriString(origin, UriKind.Absolute)))
            .ValidateOnStart();

        services
            .AddOptions<PersistenceOptions>()
            .Bind(configuration.GetSection(PersistenceOptions.SectionName))
            .Configure(options =>
            {
                var flatDriver = configuration["PERSISTENCE_DRIVER"];

                if (!string.IsNullOrWhiteSpace(flatDriver))
                {
                    options.Driver = flatDriver;
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

        services
            .AddOptions<S3Options>()
            .Bind(configuration.GetSection(S3Options.SectionName))
            .Configure(options =>
            {
                ApplyS3EnvironmentOverrides(configuration, options);
            })
            .ValidateDataAnnotations()
            .ValidateOnStart();

        AddRepositories(services, ResolvePersistenceDriver(configuration));
        services.AddScoped<ProjectService>();
        services.AddScoped<SessionService>();
        services.AddScoped<TrackService>();
        services.AddSingleton<IAmazonS3>(serviceProvider =>
            S3ClientFactory.CreateClient(
                serviceProvider.GetRequiredService<IOptions<S3Options>>().Value
            )
        );
        services.AddSingleton<IAudioUploadUrlSigner, S3AudioUploadUrlSigner>();
        services.AddScoped<AudioUploadUrlService>();

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

    private static LooprCorsOptions BuildCorsOptions(IConfiguration configuration)
    {
        var options = new LooprCorsOptions();
        configuration.GetSection(LooprCorsOptions.SectionName).Bind(options);
        ApplyCorsEnvironmentOverrides(configuration, options);

        return options;
    }

    public static void ApplyCorsEnvironmentOverrides(
        IConfiguration configuration,
        LooprCorsOptions options
    )
    {
        var allowedOrigins = configuration["CORS_ALLOWED_ORIGINS"];

        if (string.IsNullOrWhiteSpace(allowedOrigins))
        {
            return;
        }

        options.AllowedOrigins = allowedOrigins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
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

    private static void ApplyS3EnvironmentOverrides(
        IConfiguration configuration,
        S3Options options
    )
    {
        options.Region = configuration["AWS_REGION"] ?? options.Region;
        options.AudioBucketName = configuration["S3_AUDIO_BUCKET_NAME"] ?? options.AudioBucketName;

        var expiresInSeconds = configuration["S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS"];

        if (!string.IsNullOrWhiteSpace(expiresInSeconds))
        {
            options.PresignedUploadExpiresSeconds = int.TryParse(expiresInSeconds, out var parsed)
                ? parsed
                : 0;
        }
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
