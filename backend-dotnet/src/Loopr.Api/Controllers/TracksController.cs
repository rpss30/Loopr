using Loopr.Api.Contracts;
using Loopr.Api.Errors;
using Loopr.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Loopr.Api.Controllers;

[ApiController]
[Route("api/v1/tracks")]
public sealed class TracksController(TrackService trackService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TracksEnvelope>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TracksEnvelope>> ListTracks(
        CancellationToken cancellationToken
    )
    {
        var tracks = await trackService.ListTracksAsync(cancellationToken);

        return Ok(new TracksEnvelope(tracks.Select(TrackResponse.FromDomain).ToArray()));
    }

    [HttpPost]
    [ProducesResponseType<TrackEnvelope>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TrackEnvelope>> CreateTrack(
        CreateTrackRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await trackService.CreateTrackAsync(request, cancellationToken);

        return result.Status switch
        {
            CreateTrackStatus.ProjectNotFound => NotFound(
                new ApiErrorEnvelope(
                    new ApiError("project_not_found", "Project not found.", HttpContext.TraceIdentifier)
                )
            ),
            CreateTrackStatus.SessionNotFound => NotFound(
                new ApiErrorEnvelope(
                    new ApiError("session_not_found", "Session not found.", HttpContext.TraceIdentifier)
                )
            ),
            CreateTrackStatus.SessionProjectMismatch => BadRequest(
                new ApiErrorEnvelope(
                    new ApiError(
                        "session_project_mismatch",
                        "Session does not belong to the provided project.",
                        HttpContext.TraceIdentifier
                    )
                )
            ),
            _ => Created(
                $"/api/v1/tracks/{result.Track!.Id}",
                new TrackEnvelope(TrackResponse.FromDomain(result.Track))
            ),
        };
    }

    [HttpGet("{trackId}")]
    [ProducesResponseType<TrackEnvelope>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TrackEnvelope>> GetTrack(
        string trackId,
        CancellationToken cancellationToken
    )
    {
        var track = await trackService.GetTrackByIdAsync(trackId, cancellationToken);

        if (track is null)
        {
            return NotFound(
                new ApiErrorEnvelope(
                    new ApiError("track_not_found", "Track not found.", HttpContext.TraceIdentifier)
                )
            );
        }

        return Ok(new TrackEnvelope(TrackResponse.FromDomain(track)));
    }
}
