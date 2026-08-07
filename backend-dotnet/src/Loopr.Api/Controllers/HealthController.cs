using Loopr.Api.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Loopr.Api.Controllers;

[ApiController]
public sealed class HealthController(IOptions<LooprApiOptions> options) : ControllerBase
{
    [HttpGet("/health")]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> GetHealth()
    {
        return Ok(new HealthResponse("ok", options.Value.ServiceName));
    }
}

public sealed record HealthResponse(string Status, string Service);
