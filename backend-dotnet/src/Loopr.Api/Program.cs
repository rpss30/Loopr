using Loopr.Api.Configuration;
using Loopr.Api.Errors;
using Loopr.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLooprApiFoundation(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<ApiExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

if (app.Environment.IsEnvironment("Test"))
{
    app.MapPost(
            "/api/v1/e2e/reset",
            async (
                ITrackRepository trackRepository,
                ISessionRepository sessionRepository,
                IProjectRepository projectRepository,
                CancellationToken cancellationToken
            ) =>
            {
                await trackRepository.ResetAsync(cancellationToken);
                await sessionRepository.ResetAsync(cancellationToken);
                await projectRepository.ResetAsync(cancellationToken);

                return Results.NoContent();
            }
        )
        .ExcludeFromDescription();
}

app.MapFallback(ApiErrorResults.NotFound);

app.Run();

public partial class Program;
