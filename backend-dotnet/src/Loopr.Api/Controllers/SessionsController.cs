using Loopr.Api.Contracts;
using Loopr.Api.Errors;
using Loopr.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Loopr.Api.Controllers;

[ApiController]
[Route("api/v1/sessions")]
public sealed class SessionsController(SessionService sessionService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<SessionsEnvelope>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SessionsEnvelope>> ListSessions(
        CancellationToken cancellationToken
    )
    {
        var sessions = await sessionService.ListSessionsAsync(cancellationToken);

        return Ok(new SessionsEnvelope(sessions.Select(SessionResponse.FromDomain).ToArray()));
    }

    [HttpPost]
    [ProducesResponseType<SessionEnvelope>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionEnvelope>> CreateSession(
        CreateSessionRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await sessionService.CreateSessionAsync(request, cancellationToken);

        if (result.Status == CreateSessionStatus.ProjectNotFound)
        {
            return NotFound(
                new ApiErrorEnvelope(
                    new ApiError("project_not_found", "Project not found.", HttpContext.TraceIdentifier)
                )
            );
        }

        var session = result.Session!;
        var response = new SessionEnvelope(SessionResponse.FromDomain(session));

        return Created($"/api/v1/sessions/{session.Id}", response);
    }

    [HttpGet("{sessionId}")]
    [ProducesResponseType<SessionEnvelope>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionEnvelope>> GetSession(
        string sessionId,
        CancellationToken cancellationToken
    )
    {
        var session = await sessionService.GetSessionByIdAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return NotFound(
                new ApiErrorEnvelope(
                    new ApiError("session_not_found", "Session not found.", HttpContext.TraceIdentifier)
                )
            );
        }

        return Ok(new SessionEnvelope(SessionResponse.FromDomain(session)));
    }
}
