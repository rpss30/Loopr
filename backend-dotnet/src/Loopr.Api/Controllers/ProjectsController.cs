using Loopr.Api.Contracts;
using Loopr.Api.Errors;
using Loopr.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Loopr.Api.Controllers;

[ApiController]
[Route("api/v1/projects")]
public sealed class ProjectsController(ProjectService projectService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ProjectsEnvelope>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProjectsEnvelope>> ListProjects(
        CancellationToken cancellationToken
    )
    {
        var projects = await projectService.ListProjectsAsync(cancellationToken);

        return Ok(new ProjectsEnvelope(projects.Select(ProjectResponse.FromDomain).ToArray()));
    }

    [HttpPost]
    [ProducesResponseType<ProjectEnvelope>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProjectEnvelope>> CreateProject(
        CreateProjectRequest request,
        CancellationToken cancellationToken
    )
    {
        var project = await projectService.CreateProjectAsync(request, cancellationToken);
        var response = new ProjectEnvelope(ProjectResponse.FromDomain(project));

        return Created($"/api/v1/projects/{project.Id}", response);
    }

    [HttpGet("{projectId}")]
    [ProducesResponseType<ProjectEnvelope>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiErrorEnvelope>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectEnvelope>> GetProject(
        string projectId,
        CancellationToken cancellationToken
    )
    {
        var project = await projectService.GetProjectByIdAsync(projectId, cancellationToken);

        if (project is null)
        {
            return NotFound(
                new ApiErrorEnvelope(
                    new ApiError("project_not_found", "Project not found.", HttpContext.TraceIdentifier)
                )
            );
        }

        return Ok(new ProjectEnvelope(ProjectResponse.FromDomain(project)));
    }
}
