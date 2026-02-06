import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';

export type LiveTranscriberHandle = {
  start: (stream?: MediaStream) => Promise<void>;
  stop: () => void;
};

export type LiveTranscriberSegment = {
  id?: number;
  start?: number;
  end?: number;
  text: string;
  speaker?: string;
};

export type LiveTranscriberProps = {
  onFinal?: (text: string) => void;
  onPartial?: (text: string) => void;
  onSegment?: (segment: LiveTranscriberSegment) => void;
  onSpeaker?: (update: { id: number; speaker: string }) => void;
  inputStream?: MediaStream;
  showControls?: boolean;
  showTranscript?: boolean;
  stopStreamOnStop?: boolean;
  className?: string;
};

const LiveTranscriber = React.forwardRef<LiveTranscriberHandle, LiveTranscriberProps>(function LiveTranscriber(props, ref) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<'cpu'|'cuda'>('cpu');
  const [model, setModel] = useState<'tiny'|'base'|'medium'|'large'>('base');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [partial, setPartial] = useState<string>('');
  const mediaRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const supportsSegmentsRef = useRef(false);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (mediaRef.current) {
        mediaRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function start(streamOverride?: MediaStream) {
    supportsSegmentsRef.current = false;
    const stream =
      streamOverride ||
      props.inputStream ||
      (await navigator.mediaDevices.getUserMedia({ audio: true }));
    mediaRef.current = stream;
    ownsStreamRef.current = !(streamOverride || props.inputStream);

    const audioCtx = new AudioContext({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    source.connect(processor);
    // Route through a zero-gain node to keep the processor alive without audio output.
    const zeroGain = audioCtx.createGain();
    zeroGain.gain.value = 0;
    processor.connect(zeroGain);
    zeroGain.connect(audioCtx.destination);

    const ws = new WebSocket('ws://localhost:4000');
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      console.log('ws open');
      // Inform server of desired device/model before streaming
      const compute_type = device === 'cuda' ? 'float16' : 'int8';
      try { ws.send(JSON.stringify({ type: 'control', cmd: 'set', device, model, compute_type })); } catch (e) {}
      setConnected(true);
    };
    ws.onerror = (err) => {
      console.error('ws error', err);
    };
    ws.onclose = (ev) => {
      console.log('ws close', ev);
      setConnected(false);
      // stop audio processing when connection closes
      try {
        if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current.onaudioprocess = null;
          processorRef.current = null;
        }
      } catch (e) {}
      try {
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
      } catch (e) {}
      try {
        if (mediaRef.current) {
          mediaRef.current.getTracks().forEach(t => t.stop());
          mediaRef.current = null;
        }
      } catch (e) {}
    };
    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data.toString());
        console.debug('ws msg', obj);
        if (obj.type === 'segment' && obj.text) {
          supportsSegmentsRef.current = true;
          const text = (obj.text || '').replace(/\s+/g, ' ').trim();
          setTranscript(prev => [...prev, text]);
          setPartial('');
          if (props.onSegment) {
            props.onSegment({
              id: obj.id,
              start: obj.start,
              end: obj.end,
              text,
              speaker: obj.speaker,
            });
          }
        } else if (obj.type === 'speaker' && typeof obj.id === 'number' && obj.speaker) {
          if (props.onSpeaker) {
            props.onSpeaker({ id: obj.id, speaker: obj.speaker });
          }
        } else if (obj.type === 'partial') {
          const text = (obj.text || '').replace(/\s+/g, ' ').trim();
          setPartial(text);
          if (props.onPartial) props.onPartial(text);
        } else if (obj.type === 'final' && obj.text) {
          if (supportsSegmentsRef.current && props.onSegment) {
            return;
          }
          const text = (obj.text || '').replace(/\s+/g, ' ').trim();
          setTranscript(prev => [...prev, text]);
          setPartial('');
          if (props.onFinal) props.onFinal(text);
        } else if (obj.type === 'meta' || obj.type === 'info') {
          console.debug('transcriber meta', obj);
        } else if (obj.type === 'error') {
          console.error('transcriber error', obj);
        }
      } catch (e) { console.error('ws parse error', e, ev.data); }
    };
    wsRef.current = ws;

    const targetSampleRate = 16000;
    let audioChunkCount = 0;
    let totalAudioLevel = 0;

    processor.onaudioprocess = (evt) => {
      const input = evt.inputBuffer.getChannelData(0);
      const resampled = resampleBuffer(input, audioCtx.sampleRate, targetSampleRate);
      const int16 = floatTo16BitPCM(resampled);
      
      // Calculate audio level for debugging
      audioChunkCount++;
      const rms = Math.sqrt(resampled.reduce((sum, val) => sum + val * val, 0) / resampled.length);
      totalAudioLevel += rms;
      
      // Log audio level every 50 chunks (~2-3 seconds)
      if (audioChunkCount % 50 === 0) {
        const avgLevel = totalAudioLevel / 50;
        console.log(`Audio level (RMS): ${avgLevel.toFixed(4)} - ${avgLevel > 0.001 ? '✓ Audio detected' : '⚠️ Very low/no audio'}`);
        totalAudioLevel = 0;
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(int16.buffer);
        } catch (e) {
          console.error('ws send error', e);
          stop();
        }
      }
    };
  }

  function stop() {
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'control', cmd: 'end' })); } catch (e) {}
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); processorRef.current.onaudioprocess = null; } catch (e) {}
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    const shouldStopStream = props.stopStreamOnStop ?? ownsStreamRef.current;
    if (mediaRef.current && shouldStopStream) {
      mediaRef.current.getTracks().forEach(t => t.stop());
    }
    mediaRef.current = null;
    setConnected(false);
  }

  useImperativeHandle(ref, () => ({ start, stop }), [start, stop]);

  if (props.showControls === false && props.showTranscript === false) {
    return null;
  }

  return (
    <div className={props.className ? `w-full ${props.className}` : "w-full"}>
      {props.showControls !== false ? (
        <div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label style={{display:'flex', gap:6, alignItems:'center'}}>
              <span>Device</span>
              <select value={device} onChange={(e) => {
                const v = e.target.value as 'cpu'|'cuda';
                setDevice(v);
                // if connected, inform server immediately
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  const compute_type = v === 'cuda' ? 'float16' : 'int8';
                  try { wsRef.current.send(JSON.stringify({ type: 'control', cmd: 'set', device: v, model, compute_type })); } catch (e) {}
                }
              }}>
                <option value="cpu">CPU</option>
                <option value="cuda">GPU (CUDA)</option>
              </select>
            </label>
            <label style={{display:'flex', gap:6, alignItems:'center'}}>
              <span>Model</span>
              <select value={model} onChange={(e) => {
                const v = e.target.value as any;
                setModel(v);
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  const compute_type = device === 'cuda' ? 'float16' : 'int8';
                  try { wsRef.current.send(JSON.stringify({ type: 'control', cmd: 'set', device, model: v, compute_type })); } catch (e) {}
                }
              }}>
                <option value="tiny">tiny</option>
                <option value="base">base</option>
                <option value="medium">medium</option>
                <option value="large">large</option>
              </select>
            </label>
            <button onClick={start} disabled={connected}>Start</button>
            <button onClick={stop} disabled={!connected}>Stop</button>
          </div>
        </div>
      ) : null}
      {props.showTranscript === false ? null : (
        <div style={{marginTop:12}}>
          <strong>Live Transcript</strong>
          <div style={{whiteSpace:'pre-wrap', marginTop:8}}>
              {transcript.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
              {partial ? <div style={{color: '#666'}}>{partial}</div> : null}
          </div>
        </div>
      )}
    </div>
  );
});

export default LiveTranscriber;

function floatTo16BitPCM(float32Array: Float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Int16Array(buffer);
}

function resampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number) {
  if (outSampleRate === sampleRate) return buffer;
  const ratio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}
