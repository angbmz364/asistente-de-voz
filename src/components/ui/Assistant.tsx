import { useEffect, useState } from "react"

const Assistant = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return undefined
    }

    const updateSpeechState = () => {
      setIsSpeaking(window.speechSynthesis.speaking)
    }

    updateSpeechState()

    const intervalId = window.setInterval(updateSpeechState, 120)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="assistant-shell">
      <div className={`assistant-orb ${isSpeaking ? "assistant-orb-speaking" : ""}`}>
        <div className="assistant-glow" />
        <div className="assistant-inner">
          <div className="assistant-ring" />
          <span className="assistant-icon">✦</span>
        </div>
      </div>


      {isSpeaking && (
        <>
          <span className="assistant-wave assistant-wave-one" />
          <span className="assistant-wave assistant-wave-two" />
          <span className="assistant-wave assistant-wave-three" />
        </>
      )}
    </div>
  )
}

export default Assistant