namespace Loopr.Api.Errors;

public sealed record ApiErrorEnvelope(ApiError Error);

public sealed record ApiError(
    string Code,
    string Message,
    string TraceId,
    IReadOnlyList<ApiValidationError>? Details = null
);

public sealed record ApiValidationError(string Path, string Message);
