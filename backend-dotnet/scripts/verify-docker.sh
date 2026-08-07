#!/usr/bin/env bash
set -euo pipefail

image_name="${LOOPR_DOTNET_DOCKER_IMAGE:-loopr-dotnet-api:local}"
container_name="${LOOPR_DOTNET_DOCKER_CONTAINER:-loopr-dotnet-api-test}"
host_port="${LOOPR_DOTNET_DOCKER_PORT:-5104}"
health_body="/tmp/loopr-dotnet-docker-health.json"
project_body="/tmp/loopr-dotnet-docker-project.json"
upload_body="/tmp/loopr-dotnet-docker-upload.json"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}

trap cleanup EXIT

cleanup

docker build -f backend-dotnet/Dockerfile -t "$image_name" .

docker run \
  --detach \
  --name "$container_name" \
  --publish "127.0.0.1:${host_port}:8080" \
  --env ASPNETCORE_ENVIRONMENT=Test \
  --env PERSISTENCE_DRIVER=memory \
  --env AWS_REGION=us-west-2 \
  --env S3_AUDIO_BUCKET_NAME=loopr-audio-local \
  --env S3_PRESIGNED_UPLOAD_EXPIRES_SECONDS=900 \
  --env AWS_ACCESS_KEY_ID=loopr-local \
  --env AWS_SECRET_ACCESS_KEY=loopr-local \
  "$image_name" >/dev/null

for _ in {1..30}; do
  if curl --fail --silent "http://127.0.0.1:${host_port}/health" >"$health_body"; then
    break
  fi

  sleep 1
done

if ! grep --quiet '"status":"ok"' "$health_body"; then
  echo "Container did not return the expected health response."
  docker logs "$container_name"
  exit 1
fi

project_status="$(
  curl \
    --silent \
    --output "$project_body" \
    --write-out '%{http_code}' \
    --request POST \
    --header 'Content-Type: application/json' \
    --data '{"name":"Docker Verification Project","bpm":104}' \
    "http://127.0.0.1:${host_port}/api/v1/projects"
)"

if [[ "$project_status" != "201" ]]; then
  echo "Expected project creation to return 201, got ${project_status}."
  cat "$project_body"
  docker logs "$container_name"
  exit 1
fi

upload_status="$(
  curl \
    --silent \
    --output "$upload_body" \
    --write-out '%{http_code}' \
    --request POST \
    --header 'Content-Type: application/json' \
    --data '{"projectId":"project-1","sessionId":"session-1","trackId":"track-1","contentType":"audio/mp4"}' \
    "http://127.0.0.1:${host_port}/api/v1/audio/upload-url"
)"

if [[ "$upload_status" != "201" ]]; then
  echo "Expected upload URL creation to return 201, got ${upload_status}."
  cat "$upload_body"
  docker logs "$container_name"
  exit 1
fi

if ! grep --quiet 'X-Amz-Signature=' "$upload_body"; then
  echo "Upload URL response did not include an AWS signature."
  cat "$upload_body"
  docker logs "$container_name"
  exit 1
fi

echo "Verified ASP.NET Core Docker image on http://127.0.0.1:${host_port}."
