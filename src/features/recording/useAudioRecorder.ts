import { useCallback, useRef, useState } from 'react';

/** Web DOM globals accessed defensively (no DOM lib in the RN tsconfig). */
const g = globalThis as unknown as {
  navigator?: { mediaDevices?: { getUserMedia: (c: any) => Promise<any> } };
  MediaRecorder?: any;
  setInterval: (fn: () => void, ms: number) => any;
  clearInterval: (id: any) => void;
};

/**
 * Microphone recording via the browser MediaRecorder API (web). Returns the recorded
 * audio as a Blob. Native (the eventual app) would use expo-av instead.
 */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const chunksRef = useRef<any[]>([]);
  const timerRef = useRef<any>(null);

  const supported = !!g.navigator?.mediaDevices?.getUserMedia && !!g.MediaRecorder;

  const start = useCallback(async () => {
    if (!supported) throw new Error('Audio recording is not supported in this browser.');
    const stream = await g.navigator!.mediaDevices!.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const rec = new g.MediaRecorder(stream);
    rec.ondataavailable = (e: any) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start();
    recRef.current = rec;
    setSeconds(0);
    setRecording(true);
    timerRef.current = g.setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [supported]);

  const stop = useCallback(async (): Promise<Blob> => {
    return new Promise<Blob>((resolve) => {
      const rec = recRef.current;
      if (!rec) {
        resolve(new Blob([]));
        return;
      }
      rec.onstop = () => {
        if (timerRef.current) g.clearInterval(timerRef.current);
        streamRef.current?.getTracks?.().forEach((t: any) => t.stop());
        setRecording(false);
        resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
      };
      rec.stop();
    });
  }, []);

  return { recording, seconds, supported, start, stop };
}
