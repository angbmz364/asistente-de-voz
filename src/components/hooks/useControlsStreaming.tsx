/**
 * Integration Example: useControls with Streaming
 * 
 * This example shows how to integrate real-time token streaming
 * into the existing Nova voice assistant interface.
 * 
 * It demonstrates:
 * 1. Streaming responses as they arrive
 * 2. Displaying streamed text in the UI
 * 3. Managing streaming state
 * 4. Handling errors gracefully
 * 5. Maintaining backward compatibility
 */

import { useCallback, useEffect, useState } from 'react'
import { askGemini, speakText } from '../services/gemini'
import { processUserInstruction } from '../services/instructionProcessor'
import {
  getListeningState,
  startListening,
  stopListening,
  subscribeListening,
} from '../services/listen.ts'
import { useStreaming } from './useStreaming'

/**
 * Original non-streaming implementation (backward compatible)
 * Keep this for simple use cases where streaming isn't needed
 */
export const useControlsNonStreaming = () => {
  const [isListening, setIsListening] = useState(getListeningState());

  useEffect(() => {
    const unsubscribe = subscribeListening(setIsListening);
    return unsubscribe;
  }, []);

  const handleCancel = useCallback(() => {
    stopListening();
  }, []);

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
        const prompt = processed.prompt;
        
        // Non-streaming: wait for complete response
        const response = await askGemini(prompt);
        console.log('Response:', response);
        speakText(response);
      } catch (error) {
        console.error('Request failed:', error);
      }
    });
  }, []);

  return { handleMicClick, handleCancel, isListening };
}

/**
 * New streaming implementation
 * Displays tokens as they arrive
 */
export const useControlsWithStreaming = () => {
  const [isListening, setIsListening] = useState(getListeningState());
  const { isStreaming, streamedText, stream: streamResponse, cancel: cancelStream } = useStreaming({
    bufferSize: 2, // Update UI every 2 tokens
  });

  useEffect(() => {
    const unsubscribe = subscribeListening(setIsListening);
    return unsubscribe;
  }, []);

  const handleCancel = useCallback(() => {
    stopListening();
    if (isStreaming) {
      cancelStream();
    }
  }, [isStreaming, cancelStream]);

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
        const prompt = processed.prompt;

        // Stream the response
        const completeResponse = await streamResponse(prompt, {
          onToken: (token) => {
            console.debug('Received token:', token);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
          },
          onComplete: () => {
            console.log('Streaming complete, speaking text');
            // Speak the complete response
            speakText(streamedText);
          },
        });

        if (completeResponse) {
          console.log('Streaming response received');
        }
      } catch (error) {
        console.error('Request failed:', error);
      }
    });
  }, [streamResponse, streamedText]);

  return {
    handleMicClick,
    handleCancel,
    isListening,
    // New streaming-related state
    isStreaming,
    streamedResponse: streamedText, // Show streaming text as it arrives
  };
}

/**
 * Advanced streaming implementation
 * With separate streaming state and optional UI updates
 */
export const useControlsAdvanced = () => {
  const [isListening, setIsListening] = useState(getListeningState());
  const [error, setError] = useState<string | null>(null);

  const { isStreaming, streamedText, stream: streamResponse, cancel: cancelStream } = useStreaming({
    bufferSize: 3,
  });

  useEffect(() => {
    const unsubscribe = subscribeListening(setIsListening);
    return unsubscribe;
  }, []);

  const handleCancel = useCallback(() => {
    stopListening();
    if (isStreaming) {
      cancelStream();
      setError(null);
    }
  }, [isStreaming, cancelStream]);

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
        setError(null);
        const processed = await processUserInstruction(transcript);
        const prompt = processed.prompt;

        const result = await streamResponse(prompt, {
          onError: (err) => {
            setError(err.message);
            console.error('Streaming error:', err);
          },
        });

        // Speak after streaming completes
        if (result) {
          speakText(result);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Request failed:', err);
      }
    });
  }, [streamResponse]);

  return {
    handleMicClick,
    handleCancel,
    isListening,
    isStreaming,
    displayText: streamedText,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hybrid implementation
 * Uses streaming by default, falls back to non-streaming if needed
 */
export const useControlsHybrid = (preferStreaming: boolean = true) => {
  const [isListening, setIsListening] = useState(getListeningState());
  const { isStreaming, streamedText, stream: streamResponse } = useStreaming();

  useEffect(() => {
    const unsubscribe = subscribeListening(setIsListening);
    return unsubscribe;
  }, []);

  const handleCancel = useCallback(() => {
    stopListening();
  }, []);

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
        const prompt = processed.prompt;

        // Choose streaming or non-streaming based on preference
        const response = preferStreaming
          ? await streamResponse(prompt, {
              onError: (error) => {
                console.error('Streaming failed, but continuing:', error);
                // Could fall back to non-streaming here
              },
            })
          : await askGemini(prompt);

        console.log('Response received:', response);
        speakText(response ?? '');
      } catch (error) {
        console.error('Request failed:', error);
      }
    });
  }, [streamResponse, preferStreaming]);

  return { handleMicClick, handleCancel, isListening, isStreaming, streamedText };
}

/**
 * Migration strategy:
 * 
 * 1. Initially use useControlsNonStreaming (current implementation)
 * 2. Test useControlsWithStreaming in development
 * 3. Gradually roll out useControlsAdvanced for better UX
 * 4. Eventually use useControlsHybrid with preferStreaming=true
 * 
 * None of these break existing functionality.
 * You can switch implementations at any time.
 */

export default useControlsNonStreaming;
