"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createAudioMediaRecorder, recordedAudioFile } from "./recorded-audio";

export function useLocalAudioRecorder(maxSeconds = 9) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const filenameRef = useRef("learner-speaking");

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const clear = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
  }, [audioUrl]);

  const start = useCallback(async (filename: string) => {
    clear();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.localStorage.setItem("wke-microphone-ready", "yes");
      const recorder = createAudioMediaRecorder(stream);
      filenameRef.current = filename;
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const file = recordedAudioFile(chunksRef.current, recorder.mimeType, filenameRef.current);
        setAudioUrl(URL.createObjectURL(file));
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
      };
      startedAtRef.current = Date.now();
      setDuration(0);
      setRecording(true);
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setDuration(Math.min(maxSeconds, elapsed));
        if (elapsed >= maxSeconds) stop();
      }, 250);
    } catch {
      setError("Keelan couldn't hear the microphone. You can use the model and continue.");
      setRecording(false);
    }
  }, [clear, maxSeconds, stop]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return { recording, audioUrl, duration, error, start, stop, clear };
}
