"use client";

import { useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export default function VoiceInputButton({
  locale,
  onTranscript,
}: {
  locale: Locale;
  onTranscript: (text: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const voiceWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return Boolean(voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition);
  }, []);

  const toggle = () => {
    if (!supported) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const voiceWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = locale === "fr" ? "fr-FR" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) onTranscript(transcript);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const label = !supported
    ? (locale === "fr" ? "Dictée vocale indisponible sur ce navigateur" : "Voice input unavailable in this browser")
    : listening
      ? (locale === "fr" ? "Arrêter l'écoute" : "Stop listening")
      : (locale === "fr" ? "Dicter la question" : "Dictate question");

  return (
    <button
      className={"voiceInputButton" + (listening ? " listening" : "")}
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-label={label}
      title={label}
    >
      {listening ? "◉" : "🎙️"}
    </button>
  );
}
