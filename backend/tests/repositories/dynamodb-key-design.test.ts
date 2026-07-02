import { describe, expect, it } from 'vitest';

import {
  buildProjectListKeys,
  buildProjectPrimaryKey,
  buildSessionLookupKeys,
  buildSessionPrimaryKey,
  buildSessionsByProjectKey,
  buildTrackLookupKeys,
  buildTrackPrimaryKey,
  buildTracksBySessionKey,
  DYNAMODB_ENTITY_TYPES,
} from '../../src/repositories/dynamodb-key-design';

describe('DynamoDB key design', () => {
  it('defines supported metadata entity types', () => {
    expect(DYNAMODB_ENTITY_TYPES).toEqual({
      project: 'PROJECT',
      session: 'SESSION',
      track: 'TRACK',
    });
  });

  it('builds project primary keys', () => {
    expect(buildProjectPrimaryKey('project-1')).toEqual({
      pk: 'PROJECT#project-1',
      sk: 'METADATA',
    });
  });

  it('builds session primary keys grouped under a project', () => {
    expect(buildSessionPrimaryKey('project-1', 'session-1')).toEqual({
      pk: 'PROJECT#project-1',
      sk: 'SESSION#session-1',
    });
  });

  it('builds track primary keys grouped under a project session', () => {
    expect(buildTrackPrimaryKey('project-1', 'session-1', 'track-1')).toEqual({
      pk: 'PROJECT#project-1',
      sk: 'SESSION#session-1#TRACK#track-1',
    });
  });

  it('builds project list index keys ordered by updated time', () => {
    expect(buildProjectListKeys('2026-01-01T00:00:00.000Z', 'project-1')).toEqual({
      gsi1pk: 'PROJECTS',
      gsi1sk: 'UPDATED_AT#2026-01-01T00:00:00.000Z#PROJECT#project-1',
    });
  });

  it('builds session lookup index keys', () => {
    expect(buildSessionLookupKeys('session-1')).toEqual({
      gsi2pk: 'SESSION#session-1',
      gsi2sk: 'METADATA',
    });
  });

  it('builds track lookup index keys', () => {
    expect(buildTrackLookupKeys('track-1')).toEqual({
      gsi2pk: 'TRACK#track-1',
      gsi2sk: 'METADATA',
    });
  });

  it('builds a sessions-by-project query shape', () => {
    expect(buildSessionsByProjectKey('project-1')).toEqual({
      pk: 'PROJECT#project-1',
      skPrefix: 'SESSION#',
    });
  });

  it('builds a tracks-by-session query shape', () => {
    expect(buildTracksBySessionKey('project-1', 'session-1')).toEqual({
      pk: 'PROJECT#project-1',
      skPrefix: 'SESSION#session-1#TRACK#',
    });
  });
});
