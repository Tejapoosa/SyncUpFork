# Live Transcription Troubleshooting Guide

## Issue: Transcription Not Showing

If you see metadata in the logs but no actual transcripts, follow these steps:

### 1. Check Audio Capture

**Symptoms:**
- Transcription server shows: `type: 'meta'` messages only
- No `type: 'segment'`, `type: 'partial'`, or `type: 'final'` messages
- Console may show: "⚠️ Very low/no audio"

**Possible Causes:**

#### A. No Audio Being Captured
- Screen share isn't capturing audio
- Microphone permissions denied
- Wrong audio source selected

**Solution:**
1. When sharing your screen, make sure to:
   - Select the **Chrome tab** (not entire screen or window)
   - Check the **"Share tab audio"** checkbox at the bottom
2. Allow microphone permissions when prompted
3. Check browser console for audio level logs: `Audio level (RMS): X.XXXX`
   - Good: > 0.01
   - Too low: < 0.001

#### B. Google Meet Tab Audio Not Enabled
Google Meet's audio might not be captured if:
- You're sharing entire screen instead of specific tab
- Tab audio checkbox wasn't checked

**Solution:**
1. Stop current transcription
2. Click "Stop Sharing"
3. Click "Share Meeting" again
4. Select the **specific Chrome tab** running Google Meet
5. **CHECK** the "Share tab audio" checkbox
6. Click "Share"

#### C. VAD (Voice Activity Detection) Filtering Out Audio
The transcriber has VAD enabled which filters out non-speech audio.

**Solution:**
If audio is being captured but VAD is too aggressive, adjust the Python environment:

```bash
# In your conda/python environment
set VAD_FILTER=false
# or
set VAD_MIN_SILENCE_MS=2000
```

Then restart the transcription server:
```bash
npm run transcribe-server
```

### 2. Check WebSocket Connection

**Check browser console:**
```javascript
// Should see:
ws open  // Connection established
ws msg { type: 'info', text: 'transcriber-started', ... }
```

**If not connected:**
1. Make sure transcription server is running: `npm run transcribe-server`
2. Check port 4000 isn't blocked by firewall
3. Check the server logs for errors

### 3. Check Python Transcriber

**Server logs should show:**
```
py stdout: {"type": "info", "text": "transcriber-started", ...}
py stdout: {"type": "meta", ...}
py stdout: {"type": "segment", "text": "actual transcribed text", ...}  ← This is what you need
```

**If segments are missing:**

#### Option A: Test with Audio File
```bash
cd server
python
```

```python
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("../public/test-audio.mp3", beam_size=5)
for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

If this works, the issue is with audio capture, not the transcriber.

#### Option B: Check Audio Input Format
The transcriber expects:
- 16-bit PCM
- 16kHz sample rate
- Mono channel
- Little-endian

This is handled by the frontend, but if you modified audio processing, verify the format.

### 4. Common Issues & Solutions

#### Issue: "Audio level (RMS): 0.0000"
**Problem:** No audio is being captured
**Solution:** 
- Re-share screen with tab audio enabled
- Check microphone permissions
- Try speaking louder or enabling system audio

#### Issue: Audio level good (> 0.01) but no transcripts
**Problem:** VAD is filtering out the audio OR language detection failing
**Solution:**
1. Disable VAD temporarily:
   ```bash
   # In server terminal
   set VAD_FILTER=false
   npm run transcribe-server
   ```

2. Set language explicitly:
   ```bash
   set WHISPER_LANGUAGE=en
   npm run transcribe-server
   ```

#### Issue: Transcripts are very delayed
**Problem:** Model is too large for CPU
**Solution:** Use smaller model
```bash
set WHISPER_MODEL=tiny
npm run transcribe-server
```

#### Issue: "python subprocess error" in logs
**Problem:** Python environment not configured
**Solution:**
1. Activate your conda environment:
   ```bash
   conda activate meet-whisper
   ```

2. Verify faster-whisper is installed:
   ```bash
   pip list | findstr faster-whisper
   ```

3. Reinstall if needed:
   ```bash
   pip install faster-whisper
   ```

### 5. Debug Checklist

- [ ] Transcription server is running (`npm run transcribe-server`)
- [ ] Browser shows "ws open" in console
- [ ] Server shows "client connected" in logs
- [ ] Audio level RMS > 0.001 in browser console
- [ ] Screen share includes "tab audio" (not just video)
- [ ] Microphone permissions granted
- [ ] Speaking/audio is playing during transcription
- [ ] Server logs show `type: 'segment'` messages (not just `type: 'meta'`)

### 6. Testing Audio Capture

Open browser console and run:
```javascript
// Test if audio stream has tracks
const stream = document.querySelector('video')?.srcObject;
if (stream) {
  const audioTracks = stream.getAudioTracks();
  console.log('Audio tracks:', audioTracks);
  console.log('Enabled:', audioTracks.map(t => t.enabled));
  console.log('Muted:', audioTracks.map(t => t.muted));
}
```

### 7. Advanced: Enable Python Debug Logging

Edit `server/transcribe_stream.py`, add after imports:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

This will show detailed transcription process info.

### 8. Quick Test Procedure

1. **Start server:**
   ```bash
   npm run transcribe-server
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Go to `/live` page**

4. **Join a Google Meet call** (or any audio/video call)

5. **Click "Share Meeting":**
   - Select the Chrome **tab** running the meet
   - **Check** "Share tab audio"
   - Click Share

6. **Click "Start Transcription"**

7. **Speak or ensure audio is playing**

8. **Check browser console:**
   - Should see: `Audio level (RMS): X.XXXX` logs every few seconds
   - RMS should be > 0.001 when audio is playing

9. **Check server terminal:**
   - Should see: `py stdout: {"type": "segment", "text": "...", ...}`
   - If only seeing `type: 'meta'`, no speech is detected

10. **Transcript should appear** in the UI within 2-4 seconds of speaking

---

## Still Not Working?

1. Check the full error logs in server terminal
2. Check browser console for JavaScript errors
3. Verify Python environment: `conda list faster-whisper`
4. Try the simplest test: Play music or a YouTube video, share that tab with audio, and see if transcriber picks it up
5. If music/video works but your voice doesn't, check microphone setup

## Environment Variables Reference

```bash
# Model selection
WHISPER_MODEL=tiny|base|small|medium|large    # Default: base (CPU) or small (GPU)
WHISPER_DEVICE=cpu|cuda|auto                   # Default: auto
COMPUTE_TYPE=int8|float16                      # Default: int8 (CPU) or float16 (GPU)

# Transcription settings
CHUNK_SECONDS=2.0                              # Seconds per chunk
BEAM_SIZE=5                                    # Higher = better quality, slower
WHISPER_LANGUAGE=en                            # Force language (optional)

# VAD (Voice Activity Detection)
VAD_FILTER=true|false                          # Default: true
VAD_MIN_SILENCE_MS=500                         # Min silence in ms

# Diarization (Speaker detection)
DIARIZATION_ENABLED=true|false                 # Default: false
HF_TOKEN=your_huggingface_token                # Required if diarization enabled
```

