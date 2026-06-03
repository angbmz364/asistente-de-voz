export type TranscriptHandler = (transcript: string) => void;

export interface STTProvider {
  startListening(onTranscript?: TranscriptHandler): boolean;
  stopListening(): void;
  getListeningState(): boolean;
  subscribeListening(listener: (listening: boolean) => void): () => void;
  getName?(): string;
}
