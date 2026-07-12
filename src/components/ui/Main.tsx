import Assistant from './Assistant'
import Controls from './Controls'
import Greeting from './Greeting'
import { StreamingProvider, useStreamingContext } from '../context/StreamingContext'

const StreamingText = () => {
  const { streamedText, isStreaming } = useStreamingContext()

  if (!streamedText && !isStreaming) return null

  return (
    <div className="max-w-xl mx-auto mt-6 px-4 select-none">
      <p className="text-lg text-neutral-300 leading-relaxed">
        {streamedText}
        {isStreaming && (
          <span className="inline-block w-0.5 h-5 ml-0.5 bg-white animate-pulse align-middle" />
        )}
      </p>
    </div>
  )
}

const Main = () => {
  return (
    <StreamingProvider>
      <Assistant />
      <StreamingText />
      <Greeting />
      <Controls />
    </StreamingProvider>
  )
}

export default Main