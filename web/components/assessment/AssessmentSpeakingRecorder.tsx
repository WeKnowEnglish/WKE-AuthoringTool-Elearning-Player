"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Mic, RotateCcw, Save } from "lucide-react";
import { saveAssessmentSpeakingRecording } from "@/lib/actions/assessment-speaking";
import { saveHomeworkTemplateSpeakingRecording } from "@/lib/actions/homework-template-speaking";
import type { AssessmentSpeakingRecording } from "@/lib/assessment";

type Props = {
  homeworkId?: string;
  partId: string;
  responseId: string;
  maxDurationSeconds: number;
  initialRecording?: AssessmentSpeakingRecording;
  onSaved: (recording: AssessmentSpeakingRecording) => void;
  submissionKind?: "assessment" | "homework-template";
};

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AssessmentSpeakingRecorder({ homeworkId, partId, responseId, maxDurationSeconds, initialRecording, onSaved, submissionKind = "assessment" }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialRecording?.url ?? "");
  const [saved, setSaved] = useState(Boolean(initialRecording));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const stop = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const duration = Math.min(Date.now() - startedAtRef.current, maxDurationSeconds * 1000);
        const nextBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setBlob(nextBlob);
        setPreviewUrl(URL.createObjectURL(nextBlob));
        setElapsedMs(duration);
        setRecording(false);
        setSaved(false);
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setBlob(null);
      setSaved(false);
      setRecording(true);
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const duration = Date.now() - startedAtRef.current;
        setElapsedMs(Math.min(duration, maxDurationSeconds * 1000));
        if (duration >= maxDurationSeconds * 1000) stop();
      }, 250);
    } catch {
      setError("Microphone access was not available. Check the browser permission and try again.");
    }
  };

  const save = async () => {
    if (!blob) return;
    setSaving(true);
    setError("");
    if (!homeworkId) {
      const pilotRecording = { id: `pilot-${partId}-${Date.now()}`, partId, responseId, durationMs: elapsedMs, url: previewUrl };
      setSaved(true);
      onSaved(pilotRecording);
      setSaving(false);
      return;
    }
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const formData = new FormData();
    formData.set("homework_id", homeworkId);
    formData.set("part_id", partId);
    formData.set("response_id", responseId);
    formData.set("duration_ms", String(elapsedMs));
    formData.set("audio", new File([blob], `answer.${extension}`, { type: blob.type || "audio/webm" }));
    const result = submissionKind === "homework-template"
      ? await saveHomeworkTemplateSpeakingRecording(formData)
      : await saveAssessmentSpeakingRecording(formData);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    setSaved(true);
    setPreviewUrl(result.recording.url || previewUrl);
    onSaved(result.recording);
  };

  return <section className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-violet-800">Your spoken answer</p><p className="mt-1 text-sm font-bold text-slate-600">Record one clear response. Maximum {formatTime(maxDurationSeconds * 1000)}.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${saved ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-600"}`}>{saved ? "Saved" : recording ? `Recording ${formatTime(elapsedMs)}` : "Not saved"}</span></div>
    {previewUrl ? <audio controls preload="metadata" src={previewUrl} className="mt-4 w-full" aria-label="Play your recorded answer" /> : null}
    <div className="mt-4 flex flex-wrap gap-2">
      {recording ? <button type="button" onClick={stop} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-red-600 px-4 font-black text-white"><CircleStop className="h-5 w-5" />Stop</button> : <button type="button" onClick={() => void start()} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#17375e] px-4 font-black text-white disabled:opacity-50">{previewUrl ? <RotateCcw className="h-5 w-5" /> : <Mic className="h-5 w-5" />}{previewUrl ? "Record again" : "Start recording"}</button>}
      {blob && !recording ? <button type="button" onClick={() => void save()} disabled={saving || saved} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#17375e] bg-[#ffd34f] px-4 font-black text-[#17375e] disabled:opacity-50"><Save className="h-5 w-5" />{saving ? "Saving…" : saved ? "Saved" : homeworkId ? "Save answer" : "Keep pilot recording"}</button> : null}
    </div>
    {error ? <p role="alert" className="mt-3 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-800">{error}</p> : null}
    {!homeworkId ? <p className="mt-3 text-xs font-bold text-violet-800">Pilot recordings stay only in this browser tab. Assigned homework uploads them privately for the teacher.</p> : null}
  </section>;
}
