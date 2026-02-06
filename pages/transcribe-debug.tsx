import React, {useEffect, useState} from 'react';

export default function TranscribeDebug() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      setMessages(prev => [...prev, 'ws open']);
    };
    ws.onmessage = (ev) => {
      setMessages(prev => [...prev, `IN: ${ev.data.toString()}`]);
    };
    ws.onerror = (e) => setMessages(prev => [...prev, `ERROR: ${String(e)}`]);
    ws.onclose = (ev) => {
      setConnected(false);
      setMessages(prev => [...prev, `closed ${ev.code} ${ev.reason || ''}`]);
    };
    return () => { try { ws.close(); } catch (e) {} };
  }, []);

  function sendTestAudio(seconds = 2) {
    const sampleRate = 16000;
    const samples = Math.floor(sampleRate * seconds);
    const buffer = new ArrayBuffer(samples * 2);
    const view = new DataView(buffer);
    // zeros already
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(buffer);
        setMessages(prev => [...prev, `SENT zeros ${seconds}s (${samples} samples)`]);
      } catch (e) {
        setMessages(prev => [...prev, `SEND ERROR: ${String(e)}`]);
      }
    } else {
      setMessages(prev => [...prev, 'WS not open']);
    }
  }

  return (
    <main style={{padding:24}}>
      <h1>Transcribe WS Debug</h1>
      <div>Connected: {String(connected)}</div>
        <div style={{marginTop:12}}>
          <button onClick={() => sendTestAudio(2)}>Send Test Audio (2s silence)</button>
        </div>
      <div style={{whiteSpace:'pre-wrap', marginTop:12}}>
        {messages.map((m,i)=>(<div key={i}>{m}</div>))}
      </div>
    </main>
  );
}
