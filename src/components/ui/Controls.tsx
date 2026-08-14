import { X, Mic, RotateCcw } from "lucide-react"
import { useEffect, useCallback, useState } from "react";
import useControls from "../hooks/useControls"
import { useStreamingContext } from "../context/StreamingContext"
import { clearHistory } from "../services/conversationStore"

const Controls = () => {
  const { handleMicClick, handleCancel, isListening } = useControls();
  const { isStreaming, isSpeaking } = useStreamingContext();
  const [showResetHint, setShowResetHint] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }, [handleCancel]);

  useEffect(() => {
    if (!isListening && !isStreaming && !isSpeaking) {
      return undefined;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isListening, isStreaming, isSpeaking]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setShowResetHint(true);
    setTimeout(() => setShowResetHint(false), 1500);
  }, []);

  const hasActivity = isListening || isStreaming || isSpeaking;

  return (
    <div className="controls_container *:cursor-pointer">
      <RotateCcw
        className={`control-button reset ${showResetHint ? 'reset-flash' : ''}`}
        onClick={handleClearHistory}
        aria-label="Clear conversation history"
      />
      <X
        className={`control-button cancel ${hasActivity ? 'cancel-active' : ''}`}
        onClick={handleCancel}
      />
      <Mic
        className={`control-button ${isListening ? 'listening' : ''}`}
        onClick={handleMicClick}
      />
    </div>
  )
}

export default Controls