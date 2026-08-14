import { useCallback, useEffect, useRef, useState } from 'react'
import { askLLMStream, speakText } from '../services/gemini'
import { processUserInstruction } from '../services/instructionProcessor'
import {
  getListeningState,
  startListening,
  stopListening,
  subscribeListening,
} from '../services/listen.ts'
import { useStreamingContext } from '../context/StreamingContext'
import { StreamingSpeech } from '../services/speech'
import { addMessage } from '../services/conversationStore'
import { updateState } from '../../lib/memory/stateStore'

const useControls = () => {
  const [isListening, setIsListening] = useState(getListeningState());
  const { appendToken, setIsStreaming, setIsSpeaking, reset, isStreaming, isSpeaking } = useStreamingContext();
  const abortRef = useRef<AbortController | null>(null);
  const speechRef = useRef<StreamingSpeech | null>(null);
  const responseTextRef = useRef('');

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
    setIsStreaming(false);
    setIsSpeaking(false);
  }, [setIsStreaming, setIsSpeaking]);

  const handleMicClick = useCallback(() => {
    if (isStreaming || isSpeaking) {
      abortRef.current?.abort();
      speechRef.current?.cancel();
      abortRef.current = null;
      speechRef.current = null;
      reset();
    }

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

        if (processed.localResponse) {
          reset();
          setIsStreaming(false);
          appendToken(processed.localResponse);
          speakText(processed.localResponse);
          addMessage('user', transcript);
          addMessage('assistant', processed.localResponse);
          updateState({
            userMessage: transcript,
            intent: processed.intent,
            executorResult: processed.executorResult,
            response: processed.localResponse,
          });
          return;
        }

        reset();
        setIsStreaming(true);
        responseTextRef.current = '';

        const controller = new AbortController();
        abortRef.current = controller;

        const speech = new StreamingSpeech(setIsSpeaking);
        speechRef.current = speech;

        await askLLMStream(processed.prompt, {
          onToken: (token) => {
            appendToken(token);
            responseTextRef.current += token;
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
            addMessage('user', transcript);
            addMessage('assistant', responseTextRef.current);
            updateState({
              userMessage: transcript,
              intent: processed.intent,
              response: responseTextRef.current,
            });
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
  }, [appendToken, setIsStreaming, setIsSpeaking, reset, isStreaming, isSpeaking]);

  return { handleMicClick, handleCancel, isListening };
}

export default useControls
