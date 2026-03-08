import { useState, useRef, useCallback } from "react";

export function useWebSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();

    const cleaned = text.replace(/[#*_~`>]/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim();
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1;
    utterance.pitch = 1;

    // Try to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.startsWith("hi"));
    const englishVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google"));
    const fallback = voices.find(v => v.lang.startsWith("en"));

    // Detect if text is mostly Hindi/Devanagari
    const devanagariChars = (cleaned.match(/[\u0900-\u097F]/g) || []).length;
    if (devanagariChars > cleaned.length * 0.3 && hindiVoice) {
      utterance.voice = hindiVoice;
      utterance.lang = "hi-IN";
    } else {
      utterance.voice = englishVoice || fallback || null;
      utterance.lang = "en-US";
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const startListening = useCallback(async (): Promise<void> => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error("SpeechRecognition not supported");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Let the browser auto-detect language
    recognition.lang = "";
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        setListening(false);
        resolve("");
        return;
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        resolve(transcript);
      };

      recognition.onerror = () => {
        setListening(false);
        resolve("");
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.stop();
    });
  }, []);

  return {
    speaking,
    listening,
    voiceEnabled,
    setVoiceEnabled,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  };
}
