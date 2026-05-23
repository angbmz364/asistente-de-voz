import { useCallback, useEffect, useState } from 'react'
import { askGemini, speakText } from '../services/gemini'
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
      try {
        const response = await askGemini(transcript);
        console.log("Gemini → Response:", response);
        speakText(response);
      } catch (error) {
        console.error("Gemini request failed:", error);
      }
    });
  }, []);

  return { handleMicClick, handleCancel, isListening };
}

export default useControls