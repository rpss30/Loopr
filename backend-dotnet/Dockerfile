# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend-dotnet/Directory.Build.props backend-dotnet/global.json ./backend-dotnet/
COPY backend-dotnet/src/Loopr.Api/Loopr.Api.csproj ./backend-dotnet/src/Loopr.Api/
RUN dotnet restore ./backend-dotnet/src/Loopr.Api/Loopr.Api.csproj

COPY backend-dotnet/src ./backend-dotnet/src
RUN dotnet publish ./backend-dotnet/src/Loopr.Api/Loopr.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    PERSISTENCE_DRIVER=memory

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

COPY --from=build /app/publish .

USER $APP_UID

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl --fail --silent --show-error http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "Loopr.Api.dll"]
