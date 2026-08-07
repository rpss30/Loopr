using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Loopr.Api.Repositories;

namespace Loopr.Api.Tests;

public sealed class ApiTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
    }

    public async Task ResetRepositoriesAsync()
    {
        using var scope = Services.CreateScope();
        var services = scope.ServiceProvider;

        await services.GetRequiredService<ITrackRepository>().ResetAsync(CancellationToken.None);
        await services.GetRequiredService<ISessionRepository>().ResetAsync(CancellationToken.None);
        await services.GetRequiredService<IProjectRepository>().ResetAsync(CancellationToken.None);
    }
}
