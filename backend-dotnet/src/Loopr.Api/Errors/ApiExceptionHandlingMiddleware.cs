namespace Loopr.Api.Errors;

public sealed class ApiExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ApiExceptionHandlingMiddleware> logger
)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Unhandled API exception for {Method} {Path}",
                context.Request.Method,
                context.Request.Path
            );

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(
                new ApiErrorEnvelope(
                    new ApiError(
                        "internal_server_error",
                        "Something went wrong.",
                        context.TraceIdentifier
                    )
                )
            );
        }
    }
}
