import * as listen from '../../components/services/listen';
import type { STTProvider } from './providers';

const provider: STTProvider = {
  startListening: (onTranscript) => listen.startListening(onTranscript),
  stopListening: () => listen.stopListening(),
  getListeningState: () => listen.getListeningState(),
  subscribeListening: (listener) => listen.subscribeListening(listener),
  getName: () => (import.meta.env.VITE_STT_PROVIDER ?? 'browser') as string,
};

export default provider;
export type { STTProvider };
