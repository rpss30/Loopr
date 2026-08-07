namespace Loopr.Api.Errors;

public static class ApiErrorResults
{
    public static IResult NotFound(HttpContext context)
    {
        return Results.Json(
            new ApiErrorEnvelope(
                new ApiError(
                    "not_found",
                    $"Route {context.Request.Method} {context.Request.Path} not found",
                    context.TraceIdentifier
                )
            ),
            statusCode: StatusCodes.Status404NotFound
        );
    }
}
