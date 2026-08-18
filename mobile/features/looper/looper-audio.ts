import { Platform } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

import { type LoopTrack } from '../../types/track';

export const RECORDING_MONITOR_VOLUME = 1;

export async function setWorkspaceAudioMode(allowsRecording: boolean) {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: allowsRecording,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
}

export async function createPreparedHighQualityRecording(
  onStatusUpdate: (durationMs: number) => void
) {
  const recording = new Audio.Recording();
  recording.setProgressUpdateInterval(250);
  recording.setOnRecordingStatusUpdate((status) => {
    onStatusUpdate(status.durationMillis ?? 0);
  });

  try {
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  } catch (error) {
    await unloadRecording(recording);
    throw error;
  }

  return recording;
}

export async function unloadRecording(recording: Audio.Recording) {
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // The recorder may not have reached a prepared state or may already be released.
  }
}

export async function stopAndUnloadSound(sound: Audio.Sound) {
  try {
    const status = await sound.getStatusAsync();

    if (status.isLoaded) {
      await sound.stopAsync();
    }

    await sound.unloadAsync();
  } catch {
    // The sound may already be stopped or unloaded by a playback callback.
  }
}

export async function stopAndUnloadSounds(sounds: Iterable<Audio.Sound>) {
  const activeSounds = Array.from(sounds);

  await Promise.all(activeSounds.map((sound) => stopAndUnloadSound(sound)));
}

export async function playRecordedTrack(
  track: LoopTrack,
  onFinished: (sound: Audio.Sound) => void
) {
  if (!track.localUri) {
    throw new Error('Cannot play a track without a local audio URI.');
  }

  let loadedSound: Audio.Sound | null = null;
  const soundObject = await Audio.Sound.createAsync(
    { uri: track.localUri },
    {
      shouldPlay: true,
      positionMillis: getTrackPlaybackStartOffsetMs(track),
      volume: track.volume,
    },
    (status) => {
      if (status.isLoaded && status.didJustFinish && loadedSound) {
        onFinished(loadedSound);
      }
    }
  );
  loadedSound = soundObject.sound;

  return soundObject.sound;
}

export async function loadSessionTrackSounds(sessionTracks: LoopTrack[]) {
  return loadTrackSoundMap(sessionTracks, (track) => ({
    shouldPlay: false,
    positionMillis: getTrackPlaybackStartOffsetMs(track),
    volume: track.volume,
  }));
}

export async function loadRecordingMonitorSounds(sessionTracks: LoopTrack[]) {
  return loadTrackSoundMap(sessionTracks, (track) => ({
    shouldPlay: false,
    isLooping: true,
    positionMillis: getTrackPlaybackStartOffsetMs(track),
    volume: RECORDING_MONITOR_VOLUME,
  }));
}

export async function playTrackSoundMapFromLoopStart(
  soundsByTrackId: Map<string, Audio.Sound>,
  sessionTracks: LoopTrack[]
) {
  await Promise.all(
    sessionTracks.flatMap((track) => {
      const sound = soundsByTrackId.get(track.id);

      return sound ? [sound.playFromPositionAsync(getTrackPlaybackStartOffsetMs(track))] : [];
    })
  );
}

export async function reinforceRecordingMonitorPlayback(
  soundsByTrackId: Map<string, Audio.Sound>,
  sessionTracks: LoopTrack[]
) {
  for (const track of sessionTracks) {
    const sound = soundsByTrackId.get(track.id);

    if (!sound) {
      continue;
    }

    try {
      await sound.setVolumeAsync(RECORDING_MONITOR_VOLUME);

      if (Platform.OS !== 'ios') {
        continue;
      }

      const status = await sound.getStatusAsync();

      if (status.isLoaded && !status.isPlaying) {
        await sound.playFromPositionAsync(getTrackPlaybackStartOffsetMs(track));
      }
    } catch {
      // This is a best-effort monitor reinforcement after recording begins.
    }
  }
}

type PlaybackStatus = Parameters<typeof Audio.Sound.createAsync>[1];

export function getTrackPlaybackStartOffsetMs(track: LoopTrack) {
  const offsetMs = track.playbackStartOffsetMs ?? 0;

  if (!Number.isFinite(offsetMs) || offsetMs <= 0) {
    return 0;
  }

  if (Number.isFinite(track.durationMs) && track.durationMs > 0 && offsetMs >= track.durationMs) {
    return 0;
  }

  return Math.round(offsetMs);
}

async function loadTrackSoundMap(
  sessionTracks: LoopTrack[],
  createStatus: (track: LoopTrack) => PlaybackStatus
) {
  const loadedSounds = new Map<string, Audio.Sound>();

  try {
    for (const track of sessionTracks) {
      if (!track.localUri) {
        continue;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: track.localUri }, createStatus(track));
      loadedSounds.set(track.id, sound);
    }

    return loadedSounds;
  } catch (error) {
    await stopAndUnloadSounds(loadedSounds.values());
    throw error;
  }
}
