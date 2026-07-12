import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type StreamingContextType = {
  streamedText: string
  isStreaming: boolean
  isSpeaking: boolean
  setStreamedText: (text: string) => void
  setIsStreaming: (v: boolean) => void
  setIsSpeaking: (v: boolean) => void
  appendToken: (token: string) => void
  reset: () => void
}

const StreamingContext = createContext<StreamingContextType | null>(null)

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const appendToken = useCallback((token: string) => {
    setStreamedText(prev => prev + token)
  }, [])

  const reset = useCallback(() => {
    setStreamedText('')
    setIsStreaming(false)
    setIsSpeaking(false)
  }, [])

  return (
    <StreamingContext.Provider value={{
      streamedText,
      isStreaming,
      isSpeaking,
      setStreamedText,
      setIsStreaming,
      setIsSpeaking,
      appendToken,
      reset,
    }}>
      {children}
    </StreamingContext.Provider>
  )
}

export const useStreamingContext = (): StreamingContextType => {
  const ctx = useContext(StreamingContext)
  if (!ctx) {
    throw new Error('useStreamingContext must be used within StreamingProvider')
  }
  return ctx
}
