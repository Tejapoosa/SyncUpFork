#!/usr/bin/env python
"""
stdin -> chunked transcription using faster-whisper.

Reads raw 16-bit little-endian PCM audio from stdin at 16 kHz.
Buffers CHUNK_SECONDS (default 2s) and transcribes each chunk with
`faster-whisper`. Emits JSON lines to stdout for partial segment events
and final chunk text.

Environment variables:
  WHISPER_MODEL    - model name or path (default: small)
  WHISPER_DEVICE   - 'auto'|'cpu'|'cuda' (default: auto)
  CHUNK_SECONDS    - seconds per chunk (default: 2.0)
  COMPUTE_TYPE     - compute type for faster-whisper (float16/int8) optional

Requirements: install `faster-whisper`, `numpy`, and an appropriate `torch`.
"""
import sys
import os
import json
import tempfile
import wave
import time
import threading

CHUNK_SECONDS = float(os.environ.get('CHUNK_SECONDS', '2.0'))
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2
BYTES_PER_CHUNK = int(CHUNK_SECONDS * SAMPLE_RATE * BYTES_PER_SAMPLE)

emit_lock = threading.Lock()

def emit(obj):
    with emit_lock:
        sys.stdout.write(json.dumps(obj) + '\n')
        sys.stdout.flush()

try:
    from faster_whisper import WhisperModel
except Exception:
    emit({"type":"error","text":"faster-whisper not installed; pip install faster-whisper"})
    sys.exit(1)

def _env_bool(name, default):
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ('1', 'true', 'yes', 'y', 'on')

# Determine device
device_env = os.environ.get('WHISPER_DEVICE', 'auto')
device = 'cpu'
if device_env == 'cuda':
    device = 'cuda'
elif device_env == 'auto':
    try:
        import torch
        if torch.cuda.is_available():
            device = 'cuda'
    except Exception:
        device = 'cpu'

env_model = os.environ.get('WHISPER_MODEL', None)
# Default to smaller models for real-time use on modest hardware.
# - Users can override via WHISPER_MODEL.
if env_model:
    model_name = env_model
else:
    model_name = 'small' if device == 'cuda' else 'base'
compute_type = os.environ.get('COMPUTE_TYPE', None)
if compute_type is None:
    compute_type = 'float16' if device == 'cuda' else 'int8'

try:
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
except Exception as e:
    emit({"type":"error","text":f"failed to load model {model_name}: {e}"})
    sys.exit(1)

# Diarization config
DIARIZATION_ENABLED = _env_bool('DIARIZATION_ENABLED', False)
DIARIZATION_INTERVAL_SECONDS = float(os.environ.get('DIARIZATION_INTERVAL_SECONDS', '30'))
DIARIZATION_WINDOW_SECONDS = float(os.environ.get('DIARIZATION_WINDOW_SECONDS', '60'))
DIARIZATION_MIN_SECONDS = float(os.environ.get('DIARIZATION_MIN_SECONDS', '20'))
DIARIZATION_SPEAKERS = int(os.environ.get('DIARIZATION_SPEAKERS', '2'))
HF_TOKEN = os.environ.get('HF_TOKEN') or os.environ.get('HUGGINGFACE_TOKEN')

diarization_pipeline = None
speaker_map = {}

if DIARIZATION_ENABLED:
    try:
        import whisperx
        diarization_pipeline = whisperx.DiarizationPipeline(
            use_auth_token=HF_TOKEN,
            device=device,
        )
    except Exception as e:
        emit({"type":"info","text":"diarization-unavailable","reason":str(e)})
        DIARIZATION_ENABLED = False

segment_id_counter = 0
segments_meta = []
segments_lock = threading.Lock()

audio_buffer = bytearray()
audio_lock = threading.Lock()
audio_start_offset = 0.0
diarization_running = False
last_diarization_time = 0.0

def write_wav(path, pcm_bytes):
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_bytes)

def _assign_speaker_label(raw_label):
    if raw_label in speaker_map:
        return speaker_map[raw_label]
    speaker_map[raw_label] = f"Speaker {len(speaker_map) + 1}"
    return speaker_map[raw_label]

def _maybe_run_diarization(total_seconds):
    global diarization_running, last_diarization_time
    if not DIARIZATION_ENABLED or diarization_pipeline is None:
        return
    if diarization_running:
        return

    with audio_lock:
        buffer_len = len(audio_buffer)
        buffer_start = audio_start_offset
        buffer_copy = bytes(audio_buffer)

    buffer_duration = buffer_len / (SAMPLE_RATE * BYTES_PER_SAMPLE)
    if buffer_duration < DIARIZATION_MIN_SECONDS:
        return

    if total_seconds - last_diarization_time < DIARIZATION_INTERVAL_SECONDS:
        return

    diarization_running = True
    last_diarization_time = total_seconds

    def run():
        global diarization_running
        wav_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
                wav_path = tf.name
            write_wav(wav_path, buffer_copy)
            diarization = diarization_pipeline(wav_path, num_speakers=DIARIZATION_SPEAKERS)

            diarization_segments = []
            for segment, _, label in diarization.itertracks(yield_label=True):
                diarization_segments.append({
                    "start": buffer_start + segment.start,
                    "end": buffer_start + segment.end,
                    "speaker": _assign_speaker_label(label),
                })

            updates = []
            if diarization_segments:
                with segments_lock:
                    for seg in segments_meta:
                        mid = (seg["start"] + seg["end"]) / 2.0
                        for diar in diarization_segments:
                            if diar["start"] <= mid <= diar["end"]:
                                if seg.get("speaker") != diar["speaker"]:
                                    seg["speaker"] = diar["speaker"]
                                    updates.append({"id": seg["id"], "speaker": diar["speaker"]})
                                break

            for update in updates:
                emit({"type":"speaker","id":update["id"],"speaker":update["speaker"]})
        except Exception as e:
            emit({"type":"info","text":"diarization-error","reason":str(e)})
        finally:
            if wav_path:
                try:
                    os.remove(wav_path)
                except Exception:
                    pass
            diarization_running = False

    threading.Thread(target=run, daemon=True).start()

def _append_audio(pcm_bytes):
    global audio_start_offset
    if not DIARIZATION_ENABLED:
        return
    with audio_lock:
        audio_buffer.extend(pcm_bytes)
        max_bytes = int(DIARIZATION_WINDOW_SECONDS * SAMPLE_RATE * BYTES_PER_SAMPLE)
        if len(audio_buffer) > max_bytes:
            extra = len(audio_buffer) - max_bytes
            del audio_buffer[:extra]
            audio_start_offset += extra / (SAMPLE_RATE * BYTES_PER_SAMPLE)

def transcribe_chunk_and_emit(pcm_bytes, chunk_start_seconds):
    global segment_id_counter
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        wav_path = tf.name
    try:
        write_wav(wav_path, pcm_bytes)
        start = time.time()
        beam_size = int(os.environ.get('BEAM_SIZE', '5'))
        language = os.environ.get('WHISPER_LANGUAGE', '').strip() or None
        no_speech_threshold = os.environ.get('NO_SPEECH_THRESHOLD', '').strip()
        log_prob_threshold = os.environ.get('LOG_PROB_THRESHOLD', '').strip()
        compression_ratio_threshold = os.environ.get('COMPRESSION_RATIO_THRESHOLD', '').strip()
        vad_filter = _env_bool('VAD_FILTER', True)
        vad_min_silence_ms = int(os.environ.get('VAD_MIN_SILENCE_MS', '500'))

        kwargs = {
            "beam_size": beam_size,
            "vad_filter": vad_filter,
        }
        if vad_filter:
            kwargs["vad_parameters"] = {"min_silence_duration_ms": vad_min_silence_ms}
        if language:
            kwargs["language"] = language
        if no_speech_threshold:
            kwargs["no_speech_threshold"] = float(no_speech_threshold)
        if log_prob_threshold:
            kwargs["log_prob_threshold"] = float(log_prob_threshold)
        if compression_ratio_threshold:
            kwargs["compression_ratio_threshold"] = float(compression_ratio_threshold)

        segments, info = model.transcribe(wav_path, **kwargs)
        chunk_text = ''
        for segment in segments:
            seg_text = segment.text.strip()
            if seg_text:
                abs_start = chunk_start_seconds + segment.start
                abs_end = chunk_start_seconds + segment.end
                segment_id_counter += 1
                seg_meta = {
                    "id": segment_id_counter,
                    "start": abs_start,
                    "end": abs_end,
                    "text": seg_text,
                    "speaker": "Speaker 1",
                }
                with segments_lock:
                    segments_meta.append(seg_meta)
                emit({
                    "type":"segment",
                    "id": seg_meta["id"],
                    "start": seg_meta["start"],
                    "end": seg_meta["end"],
                    "text": seg_meta["text"],
                    "speaker": seg_meta["speaker"],
                })
                emit({"type":"partial","start":abs_start,"end":abs_end,"text":seg_text})
                chunk_text += (seg_text + ' ')
        dur = time.time() - start
        emit({"type":"meta","decode_seconds":dur,"beam_size":beam_size,"vad_filter":vad_filter})
        if chunk_text:
            emit({"type":"final","text":chunk_text.strip()})
    finally:
        try:
            os.remove(wav_path)
        except Exception:
            pass

def main():
    buf = bytearray()
    emit({
        "type":"info",
        "text":"transcriber-started",
        "chunk_seconds":CHUNK_SECONDS,
        "device":device,
        "model":model_name,
        "diarization": DIARIZATION_ENABLED,
    })
    total_samples = 0
    while True:
        data = sys.stdin.buffer.read(BYTES_PER_CHUNK - len(buf))
        if not data:
            if buf:
                chunk_start_seconds = total_samples / SAMPLE_RATE
                transcribe_chunk_and_emit(bytes(buf), chunk_start_seconds)
                _append_audio(bytes(buf))
                total_samples += int(len(buf) / BYTES_PER_SAMPLE)
                _maybe_run_diarization(total_samples / SAMPLE_RATE)
            break
        buf.extend(data)
        if len(buf) >= BYTES_PER_CHUNK:
            chunk = bytes(buf[:BYTES_PER_CHUNK])
            del buf[:BYTES_PER_CHUNK]
            try:
                chunk_start_seconds = total_samples / SAMPLE_RATE
                transcribe_chunk_and_emit(chunk, chunk_start_seconds)
                _append_audio(chunk)
                total_samples += int(len(chunk) / BYTES_PER_SAMPLE)
                total_seconds = total_samples / SAMPLE_RATE
                _maybe_run_diarization(total_seconds)
            except Exception as e:
                emit({"type":"error","text":f"transcription error: {e}"})

if __name__ == '__main__':
    main()
