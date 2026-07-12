import { useCallback, useEffect, useRef, useState } from 'react'
import { askLLMStream } from '../services/gemini'
import { processUserInstruction } from '../services/instructionProcessor'
import {
  getListeningState,
  startListening,
  stopListening,
  subscribeListening,
} from '../services/listen.ts'
import { useStreamingContext } from '../context/StreamingContext'
import { StreamingSpeech } from '../services/speech'

const useControls = () => {
  const [isListening, setIsListening] = useState(getListeningState());
  const { appendToken, setIsStreaming, setIsSpeaking, reset } = useStreamingContext();
  const abortRef = useRef<AbortController | null>(null);
  const speechRef = useRef<StreamingSpeech | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeListening(setIsListening);
    return unsubscribe;
  }, []);

  const handleCancel = useCallback(() => {
    stopListening();
    abortRef.current?.abort();
    abortRef.current = null;
    speechRef.current?.cancel();
    speechRef.current = null;
    reset();
  }, [reset]);

  const handleMicClick = useCallback(() => {
    if (getListeningState()) {
      stopListening();
      return;
    }

    startListening(async (transcript) => {
      if (!transcript) {
        console.warn('No speech detected.');
        return;
      }

      try {
        const processed = await processUserInstruction(transcript);
        console.info('Processed instruction:', processed, JSON.stringify(processed, null, 2));
        const prompt = processed.prompt;

        reset();
        setIsStreaming(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const speech = new StreamingSpeech(setIsSpeaking);
        speechRef.current = speech;

        await askLLMStream(prompt, {
          onToken: (token) => {
            appendToken(token);
            speech.appendText(token);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setIsStreaming(false);
            speech.cancel();
          },
          onComplete: () => {
            setIsStreaming(false);
            speech.flush();
          },
          signal: controller.signal,
          bufferSize: 3,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Streaming cancelled by user.');
          return;
        }
        const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        console.error('Request failed:', msg, error);
        setIsStreaming(false);
      }
    });
  }, [appendToken, setIsStreaming, setIsSpeaking, reset]);

  return { handleMicClick, handleCancel, isListening };
}

export default useControls
