/**
 * Example: Basic Streaming Component
 * 
 * This example shows how to use the useStreaming hook to display
 * streaming responses from the LLM in real-time.
 * 
 * Usage:
 * <StreamingExample />
 */

import { useState } from 'react';
import { useStreaming } from '../hooks/useStreaming';

export const StreamingExampleBasic = () => {
  const { isStreaming, streamedText, stream, cancel } = useStreaming({
    bufferSize: 2, // Buffer 2 tokens before updating UI
  });

  const handleAsk = async () => {
    await stream('Explain quantum computing in simple terms', {
      onError: (error) => {
        console.error('Error:', error.message);
      },
    });
  };

  return (
    <div className="streaming-example">
      <h2>Nova Streaming Example</h2>
      
      <div className="controls">
        <button 
          onClick={handleAsk} 
          disabled={isStreaming}
        >
          {isStreaming ? 'Streaming...' : 'Ask Nova'}
        </button>
        
        {isStreaming && (
          <button onClick={cancel} className="cancel-btn">
            Cancel
          </button>
        )}
      </div>

      <div className="response">
        <p>{streamedText}</p>
        {isStreaming && <span className="cursor">▌</span>}
      </div>
    </div>
  );
};

/**
 * Example: Streaming with Auto-Speak
 * 
 * This example shows streaming with automatic TTS playback
 * when the stream completes.
 */
export const StreamingExampleWithTTS = () => {
  const { isStreaming, streamedText, stream, cancel } = useStreaming({
    bufferSize: 4,
    autoSpeak: true, // Automatically speak when streaming completes
  });

  const handleAsk = async () => {
    await stream('What is photosynthesis?');
  };

  return (
    <div className="streaming-with-tts">
      <h2>Nova with TTS</h2>
      
      <button 
        onClick={handleAsk} 
        disabled={isStreaming}
      >
        {isStreaming ? 'Streaming & Speaking...' : 'Ask with Voice'}
      </button>

      {isStreaming && (
        <button onClick={cancel}>Stop</button>
      )}

      <div className="output">
        {streamedText && <p>{streamedText}</p>}
      </div>
    </div>
  );
};

/**
 * Example: Streaming with Error Handling
 * 
 * Shows how to properly handle streaming errors
 */
export const StreamingExampleWithErrors = () => {
  const { isStreaming, streamedText, stream, cancel } = useStreaming();
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    setError(null);
    try {
      await stream('Tell me about artificial intelligence', {
        onError: (err) => {
          setError(err.message);
          console.error('Streaming failed:', err);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  return (
    <div className="streaming-with-errors">
      <h2>Nova with Error Handling</h2>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <button 
        onClick={handleAsk} 
        disabled={isStreaming}
      >
        Ask Nova
      </button>

      {isStreaming && (
        <div className="streaming-indicator">
          <span className="spinner">⟳</span> Streaming...
          <button onClick={cancel}>Cancel</button>
        </div>
      )}

      {streamedText && (
        <div className="response">
          <p>{streamedText}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Example: Streaming in a Controlled Component
 * 
 * Shows streaming in a more complex component with React state
 */
export const StreamingExampleControlled = () => {
  const { isStreaming, streamedText, stream, reset } = useStreaming({
    bufferSize: 3,
  });
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    setInput('');
    reset();

    // Stream assistant response
    await stream(input, {
      onError: (error) => {
        console.error('Stream error:', error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Error: ${error.message}` },
        ]);
      },
      onComplete: () => {
        // Add the complete response to messages
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: streamedText },
        ]);
      },
    });
  };

  return (
    <div className="streaming-controlled">
      <h2>Nova Chat</h2>

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Nova'}:</strong> {msg.text}
          </div>
        ))}
        
        {isStreaming && (
          <div className="message message-assistant">
            <strong>Nova:</strong> {streamedText}
            <span className="cursor">▌</span>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isStreaming}
          placeholder="Ask Nova..."
        />
        <button 
          onClick={handleSubmit} 
          disabled={isStreaming || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};
