import { File } from 'expo-file-system';

import { deleteLocalAudioFile } from '@/features/tracks/audio-file-cleanup';

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

const MockFile = File as unknown as jest.Mock;

describe('deleteLocalAudioFile', () => {
  beforeEach(() => {
    MockFile.mockReset();
  });

  it('returns true without creating a file when localUri is null', () => {
    const result = deleteLocalAudioFile(null);

    expect(result).toBe(true);
    expect(MockFile).not.toHaveBeenCalled();
  });

  it('returns true without deleting when the file does not exist', () => {
    const info = jest.fn(() => ({ exists: false }));
    const deleteFile = jest.fn();

    MockFile.mockImplementation(() => ({
      info,
      delete: deleteFile,
    }));

    const result = deleteLocalAudioFile('file:///missing-recording.m4a');

    expect(result).toBe(true);
    expect(MockFile).toHaveBeenCalledWith('file:///missing-recording.m4a');
    expect(info).toHaveBeenCalledTimes(1);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('deletes an existing file and returns true', () => {
    const info = jest.fn(() => ({ exists: true }));
    const deleteFile = jest.fn();

    MockFile.mockImplementation(() => ({
      info,
      delete: deleteFile,
    }));

    const result = deleteLocalAudioFile('file:///recording.m4a');

    expect(result).toBe(true);
    expect(MockFile).toHaveBeenCalledWith('file:///recording.m4a');
    expect(info).toHaveBeenCalledTimes(1);
    expect(deleteFile).toHaveBeenCalledTimes(1);
  });

  it('returns false when file cleanup fails', () => {
    const info = jest.fn(() => ({ exists: true }));
    const deleteFile = jest.fn(() => {
      throw new Error('delete failed');
    });

    MockFile.mockImplementation(() => ({
      info,
      delete: deleteFile,
    }));

    const result = deleteLocalAudioFile('file:///broken-recording.m4a');

    expect(result).toBe(false);
    expect(info).toHaveBeenCalledTimes(1);
    expect(deleteFile).toHaveBeenCalledTimes(1);
  });
});
