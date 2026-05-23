import { X, Mic } from "lucide-react"
import { useEffect, useCallback } from "react";
import useControls from "../hooks/useControls"

const Controls = () => {

  const { handleMicClick, handleCancel, isListening } = useControls();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }, [handleCancel]);

  useEffect(() => {
    if (!isListening) {
      return undefined;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isListening]);

  return (
    <div className="controls_container">
      <X className="control-button cancel" onClick={handleCancel} /> 
      <Mic className={`control-button ${isListening ? 'listening' : ''}`} onClick={handleMicClick} /> 
    </div>
  )
}

export default Controls