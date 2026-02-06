import React, { useRef, useState, useEffect } from 'react';
import LiveTranscriber, { LiveTranscriberHandle } from '../components/LiveTranscriber';

export default function MeetingPage() {
  const transcriberRef = useRef<LiveTranscriberHandle | null>(null);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60); // default 20 minutes
  const [finals, setFinals] = useState<string[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (running) {
      timer = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [running]);

  useEffect(() => {
    if (secondsLeft <= 0 && running) {
      stopMeeting();
    }
  }, [secondsLeft, running]);

  const onFinal = (text: string) => {
    setFinals(prev => [...prev, text]);
  };

  async function startMeeting() {
    setFinals([]);
    setSecondsLeft(20 * 60);
    setRunning(true);
    try {
      await transcriberRef.current.start();
    } catch (e) {
      console.error('failed to start transcriber', e);
      setRunning(false);
    }
  }

  function stopMeeting() {
    try { transcriberRef.current?.stop(); } catch (e) {}
    setRunning(false);
  }

  function downloadTranscript() {
    const txt = finals.join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-transcript-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <main style={{padding:24}}>
      <h1>Meeting Demo (20 min)</h1>
      <div style={{marginBottom:12}}>
        <button onClick={startMeeting} disabled={running}>Start Meeting</button>
        <button onClick={stopMeeting} disabled={!running}>Stop Meeting</button>
        <button onClick={downloadTranscript} style={{marginLeft:12}}>Download Transcript</button>
      </div>
      <div>Time left: {mins}:{secs}</div>
      <div style={{marginTop:12}}>
        <LiveTranscriber ref={transcriberRef} onFinal={onFinal} />
      </div>
      <div style={{marginTop:24}}>
        <h3>Collected Final Segments</h3>
        <div style={{whiteSpace:'pre-wrap', maxHeight:300, overflow:'auto'}}>
          {finals.map((t,i)=>(<div key={i}>{t}</div>))}
        </div>
      </div>
    </main>
  );
}
