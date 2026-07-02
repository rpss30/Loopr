export const DYNAMODB_ENTITY_TYPES = {
  project: 'PROJECT',
  session: 'SESSION',
  track: 'TRACK',
} as const;

export function buildProjectPrimaryKey(projectId: string) {
  return {
    pk: `PROJECT#${projectId}`,
    sk: 'METADATA',
  };
}

export function buildSessionPrimaryKey(projectId: string, sessionId: string) {
  return {
    pk: `PROJECT#${projectId}`,
    sk: `SESSION#${sessionId}`,
  };
}

export function buildTrackPrimaryKey(projectId: string, sessionId: string, trackId: string) {
  return {
    pk: `PROJECT#${projectId}`,
    sk: `SESSION#${sessionId}#TRACK#${trackId}`,
  };
}

export function buildProjectListKeys(updatedAt: string, projectId: string) {
  return {
    gsi1pk: 'PROJECTS',
    gsi1sk: `UPDATED_AT#${updatedAt}#PROJECT#${projectId}`,
  };
}

export function buildSessionLookupKeys(sessionId: string) {
  return {
    gsi2pk: `SESSION#${sessionId}`,
    gsi2sk: 'METADATA',
  };
}

export function buildTrackLookupKeys(trackId: string) {
  return {
    gsi2pk: `TRACK#${trackId}`,
    gsi2sk: 'METADATA',
  };
}

export function buildSessionsByProjectKey(projectId: string) {
  return {
    pk: `PROJECT#${projectId}`,
    skPrefix: 'SESSION#',
  };
}

export function buildTracksBySessionKey(projectId: string, sessionId: string) {
  return {
    pk: `PROJECT#${projectId}`,
    skPrefix: `SESSION#${sessionId}#TRACK#`,
  };
}
