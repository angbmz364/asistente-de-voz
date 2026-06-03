type TranscriptHandler = (transcript: string) => void;
type ListeningListener = (listening: boolean) => void;

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const listeners = new Set<ListeningListener>();

let recognition: SpeechRecognitionInstance | null = null;
let isListening = false;

// Faster-Whisper configuration (front-end client)
const STT_PROVIDER = (import.meta.env.VITE_STT_PROVIDER ?? "browser").toLowerCase();
const STT_SERVER_ENDPOINT = import.meta.env.VITE_STT_SERVER_ENDPOINT ?? "http://localhost:11435";

// MediaRecorder state for Faster-Whisper path
let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

const notifyListeners = (listeningState: boolean): void => {
  listeners.forEach((listener) => listener(listeningState));
};

const createRecognition = (): SpeechRecognitionInstance | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const SpeechRecognitionCtor =
    window.SpeechRecognition ?? window.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    console.warn("Speech recognition is not supported in this browser.");
    return null;
  }

  const instance = new SpeechRecognitionCtor();

  instance.lang = "es-ES";
  instance.continuous = false;
  instance.interimResults = false;

  return instance;
};

const ensureRecognition = (): SpeechRecognitionInstance | null => {
  if (!recognition) {
    recognition = createRecognition();
  }

  return recognition;
};

const handleRecognitionEnd = (): void => {
  isListening = false;
  notifyListeners(false);
};

const handleRecognitionError = (event: SpeechRecognitionErrorEvent): void => {
  console.error("Speech recognition error:", event.error);
  handleRecognitionEnd();
};

export const getListeningState = (): boolean => isListening;

export const subscribeListening = (listener: ListeningListener): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const startListening = (onTranscript?: TranscriptHandler): boolean => {
  // If Faster-Whisper provider is configured, record audio and send to local server
  if (STT_PROVIDER === "faster-whisper") {
    if (isListening) return true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Media devices API not available in this browser.");
      return false;
    }

    recordedChunks = [];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaStream = stream;
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        } catch (e) {
          mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorder!.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recordedChunks.push(ev.data);
          }
        };

        mediaRecorder!.onstop = async () => {
          const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type ?? "audio/webm" });

          try {
            const form = new FormData();
            form.append("file", blob, "recording.webm");

            const res = await fetch(`${STT_SERVER_ENDPOINT}/transcribe`, {
              method: "POST",
              body: form,
            });

            if (!res.ok) {
              console.error("STT server error:", await res.text());
              onTranscript?.("");
              handleRecognitionEnd();
              return;
            }

            const data = await res.json();
            const text = (data.transcript ?? "").toString().trim();

            if (text) {
              console.log("Speech → Text:", text);
            }

            onTranscript?.(text);
          } catch (err) {
            console.error("Failed to send audio to STT server:", err);
            onTranscript?.("");
          } finally {
            handleRecognitionEnd();
            // cleanup
            if (mediaStream) {
              mediaStream.getTracks().forEach((t) => t.stop());
            }
            mediaRecorder = null;
            mediaStream = null;
            recordedChunks = [];
          }
        };

        mediaRecorder!.start();
        isListening = true;
        notifyListeners(true);
      })
      .catch((err) => {
        console.error("Could not get user media:", err);
        handleRecognitionEnd();
      });

    return true;
  }

  // Fallback: browser SpeechRecognition
  const instance = ensureRecognition();

  if (!instance) {
    return false;
  }

  if (isListening) {
    return true;
  }

  instance.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? "")
      .join(" ")
      .trim();

    if (text) {
      console.log("Speech → Text:", text);
    }

    onTranscript?.(text);

    instance.stop();
  };

  instance.onerror = handleRecognitionError;
  instance.onend = handleRecognitionEnd;

  try {
    instance.start();
    isListening = true;
    notifyListeners(true);
    return true;
  } catch (error) {
    console.error("Could not start speech recognition:", error);
    handleRecognitionEnd();
    return false;
  }
};

export const stopListening = (): void => {
  if (STT_PROVIDER === "faster-whisper") {
    try {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (e) {
      console.error("Error stopping MediaRecorder:", e);
      handleRecognitionEnd();
    }

    return;
  }

  if (!recognition) {
    return;
  }

  if (isListening) {
    recognition.stop();
  }

  handleRecognitionEnd();
};