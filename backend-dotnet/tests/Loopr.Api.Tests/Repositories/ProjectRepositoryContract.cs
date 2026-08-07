using Loopr.Api.Domain;
using Loopr.Api.Repositories;

namespace Loopr.Api.Tests.Repositories;

public abstract class ProjectRepositoryContract
{
    protected virtual bool SupportsReset => true;

    protected abstract IProjectRepository CreateRepository();

    [Fact]
    public async Task ListAsyncReturnsProjectsByUpdatedAtDescending()
    {
        var repository = CreateRepository();
        var earlier = CreateProject("project-1", "First", DateTimeOffset.Parse("2026-01-01T00:00:00Z"));
        var later = CreateProject("project-2", "Second", DateTimeOffset.Parse("2026-01-02T00:00:00Z"));

        await repository.CreateAsync(earlier, CancellationToken.None);
        await repository.CreateAsync(later, CancellationToken.None);

        var projects = await repository.ListAsync(CancellationToken.None);

        Assert.Collection(
            projects,
            project => Assert.Equal("project-2", project.Id),
            project => Assert.Equal("project-1", project.Id)
        );
    }

    [Fact]
    public async Task GetByIdAsyncReturnsCreatedProject()
    {
        var repository = CreateRepository();
        var project = CreateProject("project-1", "Acoustic Loop", DateTimeOffset.Parse("2026-01-01T00:00:00Z"));

        await repository.CreateAsync(project, CancellationToken.None);

        var result = await repository.GetByIdAsync(project.Id, CancellationToken.None);

        Assert.Equal(project, result);
    }

    [Fact]
    public async Task ResetAsyncClearsProjects()
    {
        var repository = CreateRepository();

        await repository.CreateAsync(
            CreateProject("project-1", "Acoustic Loop", DateTimeOffset.Parse("2026-01-01T00:00:00Z")),
            CancellationToken.None
        );

        if (!SupportsReset)
        {
            await Assert.ThrowsAsync<NotSupportedException>(() =>
                repository.ResetAsync(CancellationToken.None)
            );
            return;
        }

        await repository.ResetAsync(CancellationToken.None);

        var projects = await repository.ListAsync(CancellationToken.None);

        Assert.Empty(projects);
    }

    private static LoopProject CreateProject(
        string id,
        string name,
        DateTimeOffset updatedAt
    )
    {
        return new LoopProject(id, name, 120, 0, updatedAt.AddMinutes(-5), updatedAt);
    }
}
