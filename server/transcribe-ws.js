const WebSocket = require('ws');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv is optional for this script
}

const resolvePythonExecutable = () => {
  const direct =
    process.env.PYTHON_EXECUTABLE ||
    process.env.PYTHON ||
    process.env.TRANSCRIBE_PYTHON;
  if (direct) return direct;

  const condaPrefix = process.env.CONDA_PREFIX;
  if (condaPrefix) {
    const candidates = [
      path.join(condaPrefix, 'python.exe'),
      path.join(condaPrefix, 'bin', 'python'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  const envNames = [
    process.env.TRANSCRIBE_CONDA_ENV,
    process.env.CONDA_ENV_NAME,
    process.env.CONDA_DEFAULT_ENV,
    'meet-whisper',
    'syncup',
  ].filter(Boolean);

  const uniqueEnvNames = envNames.filter(
    (value, index, array) => array.indexOf(value) === index
  );

  const condaBaseFromExe = process.env.CONDA_EXE
    ? path.resolve(process.env.CONDA_EXE, '..', '..')
    : null;

  const baseEnvDirs = [
    condaBaseFromExe ? path.join(condaBaseFromExe, 'envs') : null,
    path.join(os.homedir(), 'anaconda3', 'envs'),
    path.join(os.homedir(), 'miniconda3', 'envs'),
    path.join(os.homedir(), '.conda', 'envs'),
  ].filter(Boolean);

  for (const envName of uniqueEnvNames) {
    for (const baseDir of baseEnvDirs) {
      const winCandidate = path.join(baseDir, envName, 'python.exe');
      if (fs.existsSync(winCandidate)) return winCandidate;
      const unixCandidate = path.join(baseDir, envName, 'bin', 'python');
      if (fs.existsSync(unixCandidate)) return unixCandidate;
    }
  }

  return 'python';
};

const PORT = process.env.TRANSCRIBE_WS_PORT || 4000;

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`Transcription WebSocket server listening on ws://localhost:${PORT}`);
});

// Each connection gets its own python transcriber subprocess
wss.on('connection', (ws) => {
  console.log('client connected');
  const id = randomUUID();

  // Spawn the Python streamer which reads raw PCM from stdin
  const pyPath = path.join(__dirname, 'transcribe_stream.py');
  const pythonExec = resolvePythonExecutable();
  console.log(`using python: ${pythonExec}`);
  // Manage a Python subprocess per-connection so we can restart with different envs
  let py = null;
  let pyAlive = false;
  let writeErrorLogged = false;

  const spawnPython = (envOverrides = {}) => {
    // stop existing process if any without triggering its exit handlers
    try {
      if (py && !py.killed) {
        try { py.removeAllListeners(); } catch (e) {}
        py.kill();
      }
    } catch (e) {}

    const env = Object.assign({}, process.env, envOverrides);
    // Pipe stderr so we can capture errors from the Python process for debugging
    py = spawn(pythonExec, [pyPath], { stdio: ['pipe', 'pipe', 'pipe'], env });
    pyAlive = true;
    writeErrorLogged = false;

    // Forward any JSON-line outputs from python to client
    let buf = '';
    py.stdout.on('data', (data) => {
      const txt = data.toString();
      // also log raw python output for debugging
      console.log('py stdout:', txt.trim());
      buf += txt;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          console.log('py json:', msg);
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify(msg));
            } catch (err) {
              console.error('failed to send to ws client', err);
            }
          }
        } catch (e) {
          console.error('Invalid JSON from transcriber:', line);
        }
      }
    });

    py.stderr.on('data', (data) => {
      console.error('py stderr:', data.toString().trim());
    });

    py.on('error', (err) => {
      console.error('python subprocess error', err);
      pyAlive = false;
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: 'error', text: 'python-subprocess-error' })); } catch (e) {}
        try { ws.close(); } catch (e) {}
      }
    });

    py.on('exit', (code, signal) => {
      console.log(`python subprocess exited code=${code} signal=${signal}`);
      pyAlive = false;
      try {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      } catch (e) {}
    });

    py.stdin.on('error', (err) => {
      // EPIPE / EOF when client disconnected or python closed stdin
      console.warn('python stdin error', err && err.code ? err.code : err);
      pyAlive = false;
    });
  };

  // spawn default python process (uses environment from server process)
  spawnPython();
  // Note: stdout/stderr/exit handlers are set up inside spawnPython for each process

  const handleMessage = (message, isBinary) => {
    // Expect binary audio frames (16-bit PCM little-endian)
    if (isBinary) {
      // Avoid writes if python already exited
      if (!pyAlive) return;
      // pipe raw bytes to python stdin (guard against closed stdin)
      try {
        if (py.stdin && !py.stdin.destroyed && py.stdin.writable) {
          py.stdin.write(message, (err) => {
            if (err) {
              // suppress repeated EOF logs
              if (err && err.code === 'EOF') {
                if (!writeErrorLogged) {
                  console.warn('write to python stdin failed', err);
                  writeErrorLogged = true;
                }
              } else {
                console.warn('write to python stdin failed', err);
              }
            }
          });
        }
      } catch (err) {
        if (err && err.code === 'EOF') {
          if (!writeErrorLogged) {
            console.warn('error writing to python stdin', err);
            writeErrorLogged = true;
          }
        } else {
          console.warn('error writing to python stdin', err);
        }
      }
    } else {
      // text messages may be control signals
      try {
        const obj = JSON.parse(message.toString());
        if (obj && obj.type === 'control') {
          if (obj.cmd === 'end') {
            try { if (py && py.stdin && !py.stdin.destroyed) py.stdin.end(); } catch (e) {}
          } else if (obj.cmd === 'set') {
            // allowed fields: device, model, compute_type
            const env = {};
            if (obj.device) env.WHISPER_DEVICE = obj.device;
            if (obj.model) env.WHISPER_MODEL = obj.model;
            if (obj.compute_type) env.COMPUTE_TYPE = obj.compute_type;
            // restart python process with these env overrides
            try {
              spawnPython(env);
              // notify client that we restarted
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'info', text: 'transcriber-restarted', device: obj.device || null, model: obj.model || null }));
              }
            } catch (e) {
              console.error('failed to restart transcriber', e);
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', text: 'failed-to-restart-transcriber', reason: String(e) }));
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  };

  ws.on('message', handleMessage);

  ws.on('close', (code, reason) => {
    const reasonText = reason && reason.length ? reason.toString() : '';
    console.log('client disconnected', { code, reason: reasonText });
    try {
      // stop accepting messages
      try { ws.off('message', handleMessage); } catch (e) {}
      pyAlive = false;
      if (!py.killed) py.kill();
    } catch (e) {}
  });

  ws.on('error', (err) => {
    console.error('ws error', err);
  });
});

process.on('SIGINT', () => process.exit());
