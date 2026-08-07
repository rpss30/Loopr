using Loopr.Api.Contracts;
using Loopr.Api.Errors;
using Loopr.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Loopr.Api.Controllers;

[ApiController]
[Route("api/v1/audio")]
public sealed class AudioController(AudioUploadUrlService uploadUrlService) : ControllerBase
{
    [HttpPost("upload-url")]
    [ProducesResponseType<AudioUploadEnvelope>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AudioUploadEnvelope>> CreateUploadUrl(
        CreateAudioUploadUrlRequest request,
        CancellationToken cancellationToken
    )
    {
        var upload = await uploadUrlService.CreateUploadUrlAsync(
            new CreateAudioUploadUrlInput(
                request.ProjectId,
                request.SessionId,
                request.TrackId,
                request.ContentType
            ),
            cancellationToken
        );

        return Created(
            "/api/v1/audio/upload-url",
            new AudioUploadEnvelope(AudioUploadResponse.FromResult(upload))
        );
    }
}
