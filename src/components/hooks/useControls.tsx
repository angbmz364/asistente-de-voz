import { useCallback, useEffect, useState } from 'react'
import { askGemini, speakText } from '../services/gemini'
import { processUserInstruction } from '../services/instructionProcessor'
import {
  getListeningState,
  startListening,
  stopListening,
  subscribeListening,
} from '../services/listen.ts'

const useControls = () => {
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
        console.info('Processed instruction:', processed, JSON.stringify(processed, null, 2));
        const prompt = processed.prompt;
        const response = await askGemini(prompt);
        console.log('Gemini → Response:', response);
        speakText(response);
      } catch (error) {
        console.error('Gemini request failed:', error);
      }
    });
  }, []);

  return { handleMicClick, handleCancel, isListening };
}

export default useControls
