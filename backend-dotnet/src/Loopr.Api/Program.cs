using Loopr.Api.Configuration;
using Loopr.Api.Errors;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLooprApiFoundation(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<ApiExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.MapFallback(ApiErrorResults.NotFound);

app.Run();

public partial class Program;
