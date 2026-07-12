import { useEffect, useState, useRef } from "react"
import { useStreamingContext } from "../context/StreamingContext"

const Assistant = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const { isStreaming } = useStreamingContext()

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

  const orbClass = isStreaming
    ? "assistant-orb-streaming"
    : isSpeaking
      ? "assistant-orb-speaking"
      : ""

  return (
    <div className="assistant-shell select-none">
      <div className={`assistant-orb ${orbClass}`}>
        <div className="assistant-glow" />
        <div className="assistant-inner">
          <div className="assistant-ring" />
          <span className="assistant-icon">
            {logoError ? (
              <span className="text-3xl font-bold text-[#863bff]">N</span>
            ) : (
              <img
                ref={imgRef}
                src="/logo.webp"
                alt="Nova"
                className="size-16"
                onError={() => setLogoError(true)}
              />
            )}
          </span>
        </div>
      </div>

      {isStreaming && (
        <span className="assistant-thinking" />
      )}

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