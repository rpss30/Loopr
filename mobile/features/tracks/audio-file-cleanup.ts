import { File } from 'expo-file-system';

export function deleteLocalAudioFile(localUri: string | null) {
  if (!localUri) {
    return true;
  }

  try {
    const file = new File(localUri);
    const fileInfo = file.info();

    if (!fileInfo.exists) {
      return true;
    }

    file.delete();
    return true;
  } catch {
    return false;
  }
}
