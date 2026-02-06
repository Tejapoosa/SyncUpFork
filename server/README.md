# Server setup (Conda)

This guide shows how to create a Conda environment, install PyTorch (CPU or GPU), install Python dependencies for the transcription server, and run it.

1) Create and activate a Conda environment

```powershell
# create env with Python 3.10
conda create -n syncup python=3.10 -y
conda activate syncup
```

2) Install PyTorch

CPU-only (fastest, easiest):

```powershell
conda install -c pytorch -c conda-forge pytorch cpuonly -y
```

GPU (example for CUDA 11.8):

```powershell
conda install -c pytorch -c nvidia -c conda-forge pytorch pytorch-cuda=11.8 -y
```

Recommended model choices
- If you have a GPU and enough memory, set `WHISPER_DEVICE='cuda'` and use `WHISPER_MODEL='large-v2'` for best accuracy.
- If you only have CPU, use `WHISPER_MODEL='medium'` for a balance of quality and speed, or use `whisper.cpp` / ggml large models for higher accuracy but slower inference.

Set environment variables before starting the server, for example:

```powershell
$env:WHISPER_DEVICE='cuda'      # or 'cpu' or 'auto'
$env:WHISPER_MODEL='large-v2'   # or 'medium', 'small', etc.
$env:COMPUTE_TYPE='float16'     # recommended on GPU
$env:CHUNK_SECONDS='2.0'
npm run transcribe-server
```

3) Install the Python requirements

```powershell
# from this server folder
pip install --upgrade pip
pip install -r requirements.txt
```

4) Start the transcription WebSocket server (keep the conda env active)

```powershell
# optionally set env vars
$env:WHISPER_MODEL='small'
$env:WHISPER_DEVICE='auto'
$env:CHUNK_SECONDS='2.0'

# start node server which spawns the python transcriber
npm run transcribe-server
```

5) In another terminal, start the frontend

```powershell
npm run dev
# open http://localhost:3000/transcribe
```

Notes
- Ensure you run `npm run transcribe-server` in the same shell where the Conda env is activated so Node spawns the Conda `python`.
- For GPU, install matching CUDA drivers for your GPU and choose the correct `pytorch-cuda` version.
- If `pip install -r requirements.txt` fails, ensure you installed PyTorch via Conda first, then retry.
- Permanent fix if the wrong Python keeps getting picked: set `PYTHON_EXECUTABLE` (full path) or `TRANSCRIBE_CONDA_ENV` (env name) in the repo `.env.local` so the transcribe server can auto-resolve the right env.
Demo: 20-minute meeting

You can run a 20-minute live demo (meeting transcription) using the built-in meeting page.

1) Start the transcribe server in the activated `syncup` env:

```powershell
# set desired model/device first
$env:WHISPER_DEVICE='auto'
$env:WHISPER_MODEL='medium'
$env:CHUNK_SECONDS='2.0'
npm run transcribe-server
```

2) Start the Next frontend in another terminal and open the meeting page:

```powershell
npm run dev
# open http://localhost:3000/meeting
```

3) Click `Start Meeting`. The page will run the transcription for 20 minutes, collect all final segments, and let you download a transcript when finished (or stop early).

Notes and tips
- For best accuracy on a demo, run on a machine with GPU and set `WHISPER_DEVICE='cuda'` and `WHISPER_MODEL='large-v2'` (watch memory usage).
- Lower `CHUNK_SECONDS` (1.0) for more frequent partials but higher CPU/GPU load.
- If CPU-only and you need higher-quality offline models, consider integrating `whisper.cpp` (I can add this if you want).
