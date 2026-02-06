import React from 'react';
import dynamic from 'next/dynamic';

const LiveTranscriber = dynamic(() => import('../components/LiveTranscriber'), { ssr: false });

export default function TranscribePage() {
  return (
    <main style={{padding:24}}>
      <h1>Live Transcription</h1>
      <LiveTranscriber />
    </main>
  );
}
