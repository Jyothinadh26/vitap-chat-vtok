"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, AlertCircle, X } from "lucide-react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript, disabled }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN"; // Free en-IN Indian English speech recognition

        recognition.onresult = (event: any) => {
          if (event.results && event.results[0] && event.results[0][0]) {
            const transcript = event.results[0][0].transcript;
            onTranscript(transcript);
          }
          setIsListening(false);
          setErrorAlert(null);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          let userMsg = "Voice input error. Please try typing.";
          if (event.error === "not-allowed") {
            userMsg = "Microphone permission denied. Allow mic access in your browser settings to speak.";
          } else if (event.error === "no-speech") {
            userMsg = "No speech detected. Speak closer to your microphone.";
          } else if (event.error === "network") {
            userMsg = "Voice network error. Check connection or type query.";
          } else if (event.error === "audio-capture") {
            userMsg = "No microphone hardware detected on this device.";
          }
          setErrorAlert(userMsg);
          setTimeout(() => setErrorAlert(null), 5000);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        setRecognitionInstance(recognition);
      }
    }
  }, [onTranscript]);

  if (!isSupported) {
    // Gracefully hidden on unsupported browsers (Rule 3)
    return null;
  }

  const toggleListening = () => {
    if (disabled || !recognitionInstance) return;

    if (isListening) {
      recognitionInstance.stop();
      setIsListening(false);
    } else {
      try {
        setErrorAlert(null);
        recognitionInstance.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start voice recognition", err);
        setErrorAlert("Could not start voice recognition. Please try typing.");
        setTimeout(() => setErrorAlert(null), 4000);
      }
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Floating Error Alert */}
      {errorAlert && (
        <div className="absolute bottom-full mb-2 left-0 z-30 w-64 bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-rose-500/40 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="flex-1 text-[11px] leading-tight text-slate-200">{errorAlert}</span>
          <button
            type="button"
            onClick={() => setErrorAlert(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={isListening ? "Listening (en-IN). Tap to cancel" : "Voice input (en-IN)"}
        className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer ${
          isListening
            ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40 ring-2 ring-rose-300"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
        }`}
        title={isListening ? "Listening (en-IN)... Tap to cancel" : "Voice Input (en-IN)"}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    </div>
  );
};
