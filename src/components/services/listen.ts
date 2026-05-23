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
  if (!recognition) {
    return;
  }

  if (isListening) {
    recognition.stop();
  }

  handleRecognitionEnd();
};