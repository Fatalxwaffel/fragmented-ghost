import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Activity,
  ArrowLeft,
  Check,
  Download,
  FileAudio,
  Gauge,
  Mic,
  MonitorPlay,
  Palette,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Square,
  Video,
  WandSparkles,
  Waves,
} from 'lucide-react';

const THEMES = [
  {
    id: 'neon',
    name: 'Neon Pulse',
    note: 'Electric cyan and magenta',
    primary: '#2fffc6',
    secondary: '#ff4ed8',
    accent: '#9a7cff',
    surface: '#090b16',
    panel: '#101526',
    canvas: '#020305',
  },
  {
    id: 'ocean',
    name: 'Deep Current',
    note: 'Aquatic blue and violet',
    primary: '#53e6ff',
    secondary: '#7377ff',
    accent: '#3fc7f3',
    surface: '#06111a',
    panel: '#0b1a29',
    canvas: '#01070c',
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    note: 'Amber, coral, and hot pink',
    primary: '#ffc857',
    secondary: '#ff4f81',
    accent: '#ff7b3d',
    surface: '#180b11',
    panel: '#26121b',
    canvas: '#080304',
  },
  {
    id: 'signal',
    name: 'Silver Signal',
    note: 'Clean monochrome spectrum',
    primary: '#f4f7ff',
    secondary: '#8da3c7',
    accent: '#cbd8ee',
    surface: '#0b0e13',
    panel: '#151a22',
    canvas: '#020304',
  },
];

const SCENES = [
  ['bars', 'Prism Bars'],
  ['waveform', 'Signal Wave'],
  ['circular', 'Halo'],
  ['particles', 'Particle Field'],
  ['kaleidoscope', 'Kaleidoscope'],
  ['orbitals', 'Orbitals'],
  ['starburst', 'Starburst'],
  ['grid', 'Pulse Grid'],
  ['spiral', 'Spiral'],
  ['neon-strings', 'Neon Strings'],
  ['bubbles', 'Bubbles'],
  ['terrain', 'Terrain'],
  ['vortex', 'Vortex'],
  ['tunnel', 'Tunnel'],
  ['dna', 'DNA'],
  ['galaxy', 'Galaxy'],
];

const THEME_STORAGE_KEY = 'spectral-studio-theme';

const App = () => {
  const [audioSource, setAudioSource] = useState('none'); // 'none', 'mic', 'system', 'file'
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [activePanel, setActivePanel] = useState('source');
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('Choose a source to start the signal.');
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'neon';
    } catch {
      return 'neon';
    }
  });

  // Visualizer Settings
  const [currentScene, setCurrentScene] = useState('bars');
  const initialTheme = THEMES.find((theme) => theme.id === themeId) || THEMES[0];
  const [primaryColor, setPrimaryColor] = useState(initialTheme.primary);
  const [secondaryColor, setSecondaryColor] = useState(initialTheme.secondary);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [smoothing, setSmoothing] = useState(0.8);

  // Refs for media and DOM elements
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const mediaElementSourceRef = useRef(null);
  const animationRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingDestinationRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);
  const audioElementRef = useRef(null);
  const fileUrlRef = useRef(null);
  const settingsRef = useRef({
    currentScene,
    primaryColor,
    secondaryColor,
    sensitivity,
    canvasColor: initialTheme.canvas,
  });

  const activeTheme = useMemo(
    () => THEMES.find((theme) => theme.id === themeId) || THEMES[0],
    [themeId],
  );

  const selectTheme = (nextThemeId) => {
    const nextTheme = THEMES.find((theme) => theme.id === nextThemeId) || THEMES[0];
    setThemeId(nextTheme.id);
    setPrimaryColor(nextTheme.primary);
    setSecondaryColor(nextTheme.secondary);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme.id);
    } catch {
      // Theme persistence is optional when storage is unavailable.
    }
  };

  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.minDecibels = -92;
      analyserRef.current.maxDecibels = -12;
    }
    analyserRef.current.smoothingTimeConstant = smoothing;
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const stopAudio = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (mediaElementSourceRef.current) {
      mediaElementSourceRef.current.disconnect();
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.removeAttribute('src');
      audioElementRef.current.load();
    }
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = settingsRef.current.canvasColor;
        context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setAudioSource('none');
    setIsPlaying(false);
    setFileName('');
    setActivePanel('source');
    setMessage('Choose a source to start the signal.');
  };

  const startAudio = async (sourceType) => {
    stopAudio();
    setMessage(sourceType === 'mic' ? 'Waiting for microphone access…' : 'Choose a screen or tab and enable Share audio…');

    try {
      await initAudioContext();
      let stream;
      if (sourceType === 'mic') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: false,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      }

      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No audio was shared. Choose a tab or screen and enable 'Share audio'.");
      }

      streamRef.current = stream;
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current.connect(analyserRef.current);
      setAudioSource(sourceType);
      setIsPlaying(true);
      setMessage(sourceType === 'mic' ? 'Microphone is live.' : 'System audio is live.');
      setActivePanel('look');

      if (sourceType === 'system') {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) videoTrack.onended = stopAudio;
      }

      startVisualizer();
    } catch (error) {
      console.error('Unable to start the selected audio source.', error);
      setAudioSource('none');
      setMessage(error?.message || 'That source could not be opened. Check browser permissions and try again.');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    stopAudio();
    setMessage('Preparing your track…');
    try {
      await initAudioContext();
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.preload = 'auto';
      }
      if (!mediaElementSourceRef.current) {
        mediaElementSourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
      }

      fileUrlRef.current = URL.createObjectURL(file);
      audioElementRef.current.src = fileUrlRef.current;
      mediaElementSourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      audioElementRef.current.onended = stopAudio;
      await audioElementRef.current.play();

      setFileName(file.name);
      setAudioSource('file');
      setIsPlaying(true);
      setMessage(`${file.name} is driving the scene.`);
      setActivePanel('look');
      startVisualizer();
    } catch (error) {
      console.error('Unable to load the audio file.', error);
      setMessage('This audio file could not be played. Try MP3, WAV, FLAC, M4A, AAC, or OGG.');
    }
  };

  const togglePlayPause = async () => {
    if (audioSource === 'none' || !audioContextRef.current) return;
    if (isPlaying) {
      if (audioSource === 'file') audioElementRef.current?.pause();
      await audioContextRef.current.suspend();
      setIsPlaying(false);
      setMessage('Signal paused.');
    } else {
      await audioContextRef.current.resume();
      if (audioSource === 'file') await audioElementRef.current?.play();
      setIsPlaying(true);
      setMessage('Signal live.');
    }
  };

  const startVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);
    const adjustedData = new Uint8Array(bufferLength);
    const view = { width: 1, height: 1, dpr: 1 };

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      view.width = Math.max(1, Math.round(rect.width));
      view.height = Math.max(1, Math.round(rect.height));
      view.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(view.width * view.dpr);
      canvas.height = Math.round(view.height * view.dpr);
      canvas.style.width = `${view.width}px`;
      canvas.style.height = `${view.height}px`;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    };
    resizeCanvas();
    resizeObserverRef.current = new ResizeObserver(resizeCanvas);
    resizeObserverRef.current.observe(canvas.parentElement);

    let particles = [];
    let bubbles = [];
    let terrainRows = [];
    const initStates = () => {
        particles = Array.from({length: 150}, () => ({
            x: Math.random() * view.width,
            y: Math.random() * view.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            baseSize: Math.random() * 3 + 1
        }));
        bubbles = Array.from({length: 60}, () => ({
            x: Math.random() * view.width,
            y: Math.random() * view.height,
            size: Math.random() * 15 + 5,
            speed: Math.random() * 3 + 1,
            phase: Math.random() * Math.PI * 2
        }));
        terrainRows = Array.from({length: 25}, () => Array(40).fill(0));
    };
    initStates();

    let rotationAngle = 0;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const WIDTH = view.width;
      const HEIGHT = view.height;
      const {
        currentScene,
        primaryColor,
        secondaryColor,
        sensitivity,
        canvasColor,
      } = settingsRef.current;

      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDomainData);

      ctx.fillStyle = canvasColor;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Calculate average volume for reactive effects
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
      }
      const avgVolume = sum / bufferLength;
      const bassVolume = (dataArray[1] + dataArray[2] + dataArray[3]) / 3;

      for (let i = 0; i < bufferLength; i += 1) {
        adjustedData[i] = Math.min(255, dataArray[i] * sensitivity);
      }

      ctx.save();

      if (currentScene === 'bars') {
        const barWidth = (WIDTH / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (adjustedData[i] / 255) * HEIGHT;

          const gradient = ctx.createLinearGradient(0, HEIGHT, 0, HEIGHT - barHeight);
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(1, secondaryColor);

          ctx.fillStyle = gradient;
          ctx.fillRect(x, HEIGHT - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }
      }
      else if (currentScene === 'waveform') {
         ctx.lineWidth = 3 + (avgVolume / 50);
         const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
         gradient.addColorStop(0, primaryColor);
         gradient.addColorStop(1, secondaryColor);
         ctx.strokeStyle = gradient;
         ctx.beginPath();

         const sliceWidth = WIDTH * 1.0 / bufferLength;
         let x = 0;

         for (let i = 0; i < bufferLength; i++) {
             const v = timeDomainData[i] / 128.0;
             const y = v * HEIGHT / 2;

             if (i === 0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);

             x += sliceWidth;
         }
         ctx.lineTo(WIDTH, HEIGHT / 2);
         ctx.stroke();
      }
      else if (currentScene === 'circular') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          const radius = Math.min(centerX, centerY) / 2 + (bassVolume / 2);
          ctx.translate(centerX, centerY);

          const bars = 100;
          const step = (Math.PI * 2) / bars;

          for(let i = 0; i < bars; i++) {
              const dataIdx = Math.floor((i / bars) * bufferLength);
              const barHeight = (adjustedData[dataIdx] / 255) * (radius * 1.5);

              ctx.rotate(step);

              const gradient = ctx.createLinearGradient(0, radius, 0, radius + barHeight);
              gradient.addColorStop(0, primaryColor);
              gradient.addColorStop(1, secondaryColor);

              ctx.fillStyle = gradient;
              ctx.fillRect(-2, radius, 4, barHeight);
          }
      }
      else if (currentScene === 'starburst') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(rotationAngle * 0.5);

          const lines = 120;
          const step = (Math.PI * 2) / lines;

          for (let i = 0; i < lines; i++) {
              const dataIdx = Math.floor((i / lines) * bufferLength);
              const lineLen = (adjustedData[dataIdx] / 255) * Math.min(WIDTH, HEIGHT);

              ctx.rotate(step);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(0, lineLen);

              ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
              ctx.lineWidth = 2 + (lineLen / 100);
              ctx.stroke();
          }
      }
      else if (currentScene === 'grid') {
          const cols = 16;
          const rows = 16;
          const cellW = WIDTH / cols;
          const cellH = HEIGHT / rows;

          for (let i = 0; i < cols * rows; i++) {
              const col = i % cols;
              const row = Math.floor(i / cols);

              const dataIdx = Math.floor((i / (cols * rows)) * bufferLength);
              const val = adjustedData[dataIdx] / 255;

              const x = col * cellW;
              const y = row * cellH;

              ctx.fillStyle = (col + row) % 2 === 0 ? primaryColor : secondaryColor;
              ctx.globalAlpha = val * 0.8 + 0.1;

              const sizeMod = val * 20;
              ctx.fillRect(x + sizeMod/2, y + sizeMod/2, cellW - sizeMod, cellH - sizeMod);
          }
          ctx.globalAlpha = 1.0;
      }
      else if (currentScene === 'spiral') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          ctx.translate(centerX, centerY);

          ctx.beginPath();
          const points = 300;
          for (let i = 0; i < points; i++) {
              const dataIdx = Math.floor((i / points) * bufferLength);
              const val = adjustedData[dataIdx] / 255;

              const angle = 0.1 * i + rotationAngle * 2;
              const r = 2 * i + (val * 100);

              const x = r * Math.cos(angle);
              const y = r * Math.sin(angle);

              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 3 + (avgVolume / 50);
          ctx.stroke();
      }
      else if (currentScene === 'neon-strings') {
          const numStrings = 12;
          for (let i = 0; i < numStrings; i++) {
              ctx.beginPath();
              const yOffset = (HEIGHT / (numStrings + 1)) * (i + 1);
              ctx.moveTo(0, yOffset);

              const dataIdx = Math.floor((i / numStrings) * bufferLength);
              const val = (timeDomainData[dataIdx] - 128) / 128;
              const amp = val * 100 * (1 + avgVolume / 100);

              ctx.bezierCurveTo(
                  WIDTH / 3, yOffset - amp,
                  2 * WIDTH / 3, yOffset + amp,
                  WIDTH, yOffset
              );

              ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
              ctx.lineWidth = 2 + (adjustedData[dataIdx] / 50);
              ctx.shadowBlur = 15;
              ctx.shadowColor = ctx.strokeStyle;
              ctx.stroke();
          }
          ctx.shadowBlur = 0;
      }
      else if (currentScene === 'bubbles') {
          bubbles.forEach((b, i) => {
              if (b.x > WIDTH) b.x = Math.random() * WIDTH;

              b.y -= b.speed * (1 + avgVolume / 100);
              if (b.y < -50) {
                  b.y = HEIGHT + 50;
                  b.x = Math.random() * WIDTH;
              }

              const dataIdx = i % bufferLength;
              const pulse = adjustedData[dataIdx] / 10;
              const xWave = b.x + Math.sin(b.y / 50 + b.phase) * 30;

              ctx.beginPath();
              ctx.arc(xWave, b.y, Math.max(1, b.size + pulse), 0, Math.PI * 2);

              ctx.fillStyle = i % 2 === 0 ? primaryColor : secondaryColor;
              ctx.globalAlpha = 0.6;
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = 0.8;
              ctx.beginPath();
              ctx.arc(xWave - (b.size/3), b.y - (b.size/3), b.size/4, 0, Math.PI * 2);
              ctx.fill();
          });
          ctx.globalAlpha = 1.0;
      }
      else if (currentScene === 'terrain') {
          terrainRows.pop();
          const newRow = [];
          for(let i = 0; i < 40; i++) {
              const dataIdx = Math.floor(Math.abs(i - 20) / 20 * (bufferLength / 4));
              newRow.push(adjustedData[dataIdx] || 0);
          }
          terrainRows.unshift(newRow);

          const cellW = WIDTH / 40;
          const maxH = HEIGHT / 2;

          for(let yIdx = 24; yIdx >= 0; yIdx--) {
              const row = terrainRows[yIdx];
              const yPos = HEIGHT - (yIdx * 20);

              ctx.beginPath();
              for(let xIdx = 0; xIdx < 40; xIdx++) {
                  const scale = (yIdx + 5) / 30;
                  const centerDist = xIdx - 20;
                  const xPos = (WIDTH / 2) + (centerDist * cellW * scale * 2);

                  const val = row[xIdx];
                  const yOff = (val / 255) * maxH * scale;

                  if (xIdx === 0) ctx.moveTo(xPos, yPos - yOff);
                  else ctx.lineTo(xPos, yPos - yOff);
              }

              ctx.strokeStyle = primaryColor;
              ctx.lineWidth = 1;
              ctx.fillStyle = '#0a0a0a';
              ctx.fill();

              const grad = ctx.createLinearGradient(0, HEIGHT, 0, HEIGHT/2);
              grad.addColorStop(0, primaryColor);
              grad.addColorStop(1, secondaryColor);
              ctx.strokeStyle = grad;
              ctx.stroke();
          }
      }
      else if (currentScene === 'vortex') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          ctx.translate(centerX, centerY);

          const numPolys = 20;
          for (let i = 0; i < numPolys; i++) {
              const dataIdx = i * Math.floor(bufferLength / numPolys);
              const val = adjustedData[dataIdx] / 255;

              ctx.save();
              const scale = (numPolys - i) * 0.1 + (val * 0.5);
              ctx.scale(scale, scale);

              const dir = i % 2 === 0 ? 1 : -1;
              ctx.rotate(rotationAngle * dir * (1 + avgVolume / 100));

              ctx.beginPath();
              const sides = 3 + (i % 4);
              const radius = 100;

              for (let s = 0; s <= sides; s++) {
                  const angle = (s / sides) * Math.PI * 2;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  if (s === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
              }

              ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
              ctx.lineWidth = 2 / scale;
              ctx.stroke();
              ctx.restore();
          }
      }
      else if (currentScene === 'tunnel') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          ctx.translate(centerX, centerY);

          const numRects = 30;
          for (let i = numRects; i > 0; i--) {
              const dataIdx = i * 2;
              const val = adjustedData[dataIdx] / 255;

              const timeMod = (rotationAngle * 200) % 20;
              const size = (i * 20) + timeMod + (val * 50);

              ctx.beginPath();
              ctx.rect(-size/2, -size/2, size, size);

              const depthAlpha = i / numRects;
              ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
              ctx.globalAlpha = 1 - depthAlpha;
              ctx.lineWidth = 2 + (val * 5);

              ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
      }
      else if (currentScene === 'dna') {
          const numPoints = 60;
          const heightStep = HEIGHT / numPoints;

          for (let i = 0; i < numPoints; i++) {
              const y = i * heightStep;
              const dataIdx = Math.floor((i / numPoints) * bufferLength);
              const val = adjustedData[dataIdx] / 255;

              const phase = y / 100 + rotationAngle * 2;
              const widthSpread = 100 + (val * 100) + (bassVolume / 2);

              const x1 = WIDTH / 2 + Math.sin(phase) * widthSpread;
              const x2 = WIDTH / 2 + Math.sin(phase + Math.PI) * widthSpread;

              ctx.beginPath();
              ctx.moveTo(x1, y);
              ctx.lineTo(x2, y);
              ctx.strokeStyle = '#ffffff33';
              ctx.lineWidth = 1;
              ctx.stroke();

              const size = 3 + (val * 8);

              ctx.beginPath();
              ctx.arc(x1, y, size, 0, Math.PI * 2);
              ctx.fillStyle = primaryColor;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(x2, y, size, 0, Math.PI * 2);
              ctx.fillStyle = secondaryColor;
              ctx.fill();
          }
      }
      else if (currentScene === 'galaxy') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          ctx.translate(centerX, centerY);

          const numStars = 200;
          const arms = 4;

          for (let i = 0; i < numStars; i++) {
              const dataIdx = i % bufferLength;
              const val = adjustedData[dataIdx] / 255;

              const armIndex = i % arms;
              const armOffset = (Math.PI * 2 / arms) * armIndex;

              const r = Math.pow(i, 1.2);
              const angle = (i * 0.05) + armOffset + rotationAngle;

              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;

              ctx.beginPath();
              const starSize = Math.max(0.5, (val * 4));
              ctx.arc(x, y, starSize, 0, Math.PI * 2);

              ctx.fillStyle = armIndex % 2 === 0 ? primaryColor : secondaryColor;
              ctx.globalAlpha = Math.max(0, 1 - (r / (WIDTH/2)));
              ctx.fill();
          }
          ctx.globalAlpha = 1.0;
      }
      else if (currentScene === 'kaleidoscope') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          const radius = Math.min(WIDTH, HEIGHT) / 3 + (bassVolume / 2);

          rotationAngle -= 0.002 + (avgVolume / 10000);

          ctx.translate(centerX, centerY);
          ctx.rotate(rotationAngle);

          const segments = 8;
          const angleStep = (Math.PI * 2) / segments;

          for (let i = 0; i < segments; i++) {
              ctx.save();
              ctx.rotate(i * angleStep);

              ctx.beginPath();
              ctx.moveTo(0, 0);

              for (let j = 0; j < bufferLength; j += 16) {
                  const val = adjustedData[j];
                  const x = (j / bufferLength) * radius;
                  const y = (val / 255) * (radius / 2) * (i % 2 === 0 ? 1 : -1);
                  ctx.lineTo(x, y);
              }

              const gradient = ctx.createLinearGradient(0, 0, radius, 0);
              gradient.addColorStop(0, primaryColor);
              gradient.addColorStop(1, secondaryColor);

              ctx.strokeStyle = gradient;
              ctx.lineWidth = 2 + (avgVolume / 50);
              ctx.stroke();

              ctx.beginPath();
              for (let j = 0; j < bufferLength; j += 32) {
                   const val = adjustedData[j];
                   const x = (j / bufferLength) * (radius * 0.6);
                   const y = (val / 255) * (radius * 0.4) * (i % 2 !== 0 ? 1 : -1);
                   if (j === 0) ctx.moveTo(x, y);
                   else ctx.lineTo(x, y);
              }
              ctx.fillStyle = i % 2 === 0 ? primaryColor : secondaryColor;
              ctx.globalAlpha = 0.3;
              ctx.fill();
              ctx.globalAlpha = 1.0;

              ctx.restore();
          }
      }
      else if (currentScene === 'orbitals') {
          const centerX = WIDTH / 2;
          const centerY = HEIGHT / 2;
          const maxRadius = Math.min(WIDTH, HEIGHT) / 2;

          rotationAngle += 0.005;
          ctx.translate(centerX, centerY);

          const rings = 5;
          for (let r = 0; r < rings; r++) {
              const ringRadius = (maxRadius / rings) * (r + 1) * (0.8 + bassVolume/1000);
              const dataOffset = Math.floor((bufferLength / rings) * r);
              const ringActivity = adjustedData[dataOffset] / 255.0;

              ctx.save();
              ctx.rotate(rotationAngle * (r % 2 === 0 ? 1 : -1) * (1 + avgVolume/200));

              ctx.beginPath();
              const points = 60;
              for (let i = 0; i <= points; i++) {
                  const angle = (i / points) * Math.PI * 2;

                  const tData = timeDomainData[(dataOffset + i*2) % bufferLength] / 128.0;
                  const fData = adjustedData[(dataOffset + i*2) % bufferLength] / 255.0;

                  const rDist = ringRadius + (tData - 1) * 50 * (r+1) + (fData * 20);

                  const x = Math.cos(angle) * rDist;
                  const y = Math.sin(angle) * rDist;

                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
              }

              ctx.lineWidth = 3 + r;
              ctx.strokeStyle = r % 2 === 0 ? primaryColor : secondaryColor;

              if (avgVolume > 50) {
                 ctx.shadowBlur = 10 + (ringActivity * 20);
                 ctx.shadowColor = ctx.strokeStyle;
              }

              ctx.closePath();
              ctx.stroke();
              ctx.restore();
          }
      }
      else if (currentScene === 'particles') {
        const explosionFactor = bassVolume > 200 ? 2 : 1;

        particles.forEach((p, i) => {
            p.x += p.vx * explosionFactor * (1 + avgVolume/100);
            p.y += p.vy * explosionFactor * (1 + avgVolume/100);

            if (p.x < 0) p.x = WIDTH;
            if (p.x > WIDTH) p.x = 0;
            if (p.y < 0) p.y = HEIGHT;
            if (p.y > HEIGHT) p.y = 0;

            const size = p.baseSize + (adjustedData[i % bufferLength] / 20);
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);

            const colorRatio = adjustedData[i % bufferLength] / 255;
            ctx.fillStyle = i % 2 === 0 ? primaryColor : secondaryColor;
            ctx.globalAlpha = 0.5 + colorRatio * 0.5;

            if (bassVolume > 180) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = ctx.fillStyle;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
      }

      ctx.restore();
    };

    draw();
  }, []);

  useEffect(() => {
    settingsRef.current = {
      currentScene,
      primaryColor,
      secondaryColor,
      sensitivity,
      canvasColor: activeTheme.canvas,
    };
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = smoothing;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', activeTheme.surface);
  }, [activeTheme.canvas, currentScene, primaryColor, secondaryColor, sensitivity, smoothing]);


  const startRecording = () => {
    if (!canvasRef.current || audioSource === 'none') return;

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);
    recordedChunksRef.current = [];

    try {
      const canvasStream = canvasRef.current.captureStream(30);
      let finalStream = canvasStream;

      if (audioSource === 'file' && audioContextRef.current) {
        const destination = audioContextRef.current.createMediaStreamDestination();
        recordingDestinationRef.current = destination;
        analyserRef.current.connect(destination);
        finalStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
      } else if (streamRef.current?.getAudioTracks().length) {
        finalStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...streamRef.current.getAudioTracks(),
        ]);
      }

      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = new MediaRecorder(finalStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) recordedChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        if (recordingDestinationRef.current && analyserRef.current) {
          try {
            analyserRef.current.disconnect(recordingDestinationRef.current);
          } catch {
            // The recording route may already be disconnected during source cleanup.
          }
          recordingDestinationRef.current = null;
        }
        const blob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setMessage('Recording ready to review and download.');
        setActivePanel('export');
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      setMessage('Recording the canvas and audio…');
      setActivePanel('export');
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((previous) => previous + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording.', error);
      setMessage('Recording is unavailable in this browser. Try current Chrome or Edge.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!recordedVideoUrl) return;
    const anchor = document.createElement('a');
    anchor.href = recordedVideoUrl;
    anchor.download = `spectral-studio-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMessage('Download started. Your preview stays available here.');
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioElementRef.current?.pause();
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => () => {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
  }, [recordedVideoUrl]);

  const appStyle = {
    '--studio-primary': primaryColor,
    '--studio-secondary': secondaryColor,
    '--studio-accent': activeTheme.accent,
    '--studio-surface': activeTheme.surface,
    '--studio-panel': activeTheme.panel,
    '--studio-canvas': activeTheme.canvas,
  } as React.CSSProperties;

  const sourceName = audioSource === 'file'
    ? fileName || 'Local file'
    : audioSource === 'mic'
      ? 'Microphone'
      : audioSource === 'system'
        ? 'System audio'
        : 'No source';
  const sceneName = SCENES.find(([id]) => id === currentScene)?.[1] || 'Prism Bars';

  return (
    <div className="studio-shell" style={appStyle} data-theme={themeId}>
      <input
        id="audio-upload"
        className="visually-hidden"
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
      />

      <header className="studio-header">
        <div className="brand-lockup">
          <a className="hub-link" href="/" aria-label="Back to Fragmented Ghost App Hub">
            <ArrowLeft aria-hidden="true" />
          </a>
          <div className="brand-mark" aria-hidden="true"><Waves /></div>
          <div>
            <p className="brand-kicker">Fragmented Ghost</p>
            <h1>Spectral Studio</h1>
          </div>
        </div>

        <div className="header-actions">
          <label className="quick-theme">
            <span>Theme</span>
            <select value={themeId} onChange={(event) => selectTheme(event.target.value)}>
              {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
            </select>
          </label>
          <div className={`signal-pill ${audioSource !== 'none' ? 'is-live' : ''}`} aria-live="polite">
            <Activity aria-hidden="true" />
            <span>{isRecording ? `REC ${formatTime(recordingTime)}` : audioSource !== 'none' ? 'Signal live' : 'Standing by'}</span>
          </div>
        </div>
      </header>

      <main className="studio-workspace">
        <section className="visual-stage" aria-label="Audio visualizer preview">
          <canvas ref={canvasRef} aria-label={`${sceneName} audio visualization`} />

          <div className="stage-meta" aria-hidden="true">
            <span>{sceneName}</span>
            <span>{activeTheme.name}</span>
            <span>{sourceName}</span>
          </div>

          {audioSource === 'none' && (
            <div className="empty-stage">
              <div className="empty-stage-icon" aria-hidden="true"><Radio /></div>
              <p className="eyebrow">Audio-reactive canvas</p>
              <h2>Turn sound into motion.</h2>
              <p>Choose a track, your microphone, or system audio. Then shape the scene and record the result.</p>
              <div className="empty-stage-actions">
                <label className="primary-action" htmlFor="audio-upload">
                  <FileAudio aria-hidden="true" /> Choose a track
                </label>
                <button className="secondary-action" type="button" onClick={() => startAudio('system')}>
                  <MonitorPlay aria-hidden="true" /> Capture system audio
                </button>
              </div>
            </div>
          )}

          {audioSource !== 'none' && (
            <div className="transport-bar">
              <div className="transport-copy">
                <span className="transport-source">{sourceName}</span>
                <span>{isPlaying ? 'Reacting now' : 'Paused'}</span>
              </div>
              <div className="transport-actions">
                <button type="button" onClick={togglePlayPause} aria-label={isPlaying ? 'Pause audio' : 'Resume audio'}>
                  {isPlaying ? <Pause /> : <Play />}
                </button>
                <button type="button" onClick={stopAudio} aria-label="Stop audio"><Square /></button>
                <button
                  className={isRecording ? 'record-control is-recording' : 'record-control'}
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square /> : <span className="record-dot" />}
                  <span>{isRecording ? formatTime(recordingTime) : 'Record'}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="control-deck" aria-label="Spectral Studio controls">
          <nav className="flow-tabs" aria-label="Studio workflow">
            {[
              ['source', '01', 'Source'],
              ['look', '02', 'Look'],
              ['export', '03', 'Export'],
            ].map(([id, number, label]) => (
              <button
                key={id}
                className={activePanel === id ? 'is-active' : ''}
                type="button"
                onClick={() => setActivePanel(id)}
                aria-selected={activePanel === id}
              >
                <span>{number}</span>{label}
              </button>
            ))}
          </nav>

          <div className="deck-scroll">
            {activePanel === 'source' && (
              <section className="deck-section" aria-labelledby="source-title">
                <div className="section-heading">
                  <p className="eyebrow">Step 01</p>
                  <h2 id="source-title">Choose the signal</h2>
                  <p>Nothing is uploaded. Audio stays in this browser while you create.</p>
                </div>

                <div className="source-grid">
                  <button className={audioSource === 'mic' ? 'source-card is-selected' : 'source-card'} type="button" onClick={() => startAudio('mic')}>
                    <span className="source-icon"><Mic /></span>
                    <span><strong>Microphone</strong><small>Voice, instruments, and room sound</small></span>
                    {audioSource === 'mic' && <Check className="selected-check" />}
                  </button>
                  <button className={audioSource === 'system' ? 'source-card is-selected' : 'source-card'} type="button" onClick={() => startAudio('system')}>
                    <span className="source-icon"><MonitorPlay /></span>
                    <span><strong>System audio</strong><small>A browser tab, app, or desktop mix</small></span>
                    {audioSource === 'system' && <Check className="selected-check" />}
                  </button>
                  <label className={audioSource === 'file' ? 'source-card is-selected' : 'source-card'} htmlFor="audio-upload">
                    <span className="source-icon"><FileAudio /></span>
                    <span><strong>Local track</strong><small>MP3, WAV, FLAC, M4A, AAC, or OGG</small></span>
                    {audioSource === 'file' && <Check className="selected-check" />}
                  </label>
                </div>

                {audioSource !== 'none' && (
                  <div className="inline-transport">
                    <button type="button" onClick={togglePlayPause}>{isPlaying ? <Pause /> : <Play />} {isPlaying ? 'Pause' : 'Resume'}</button>
                    <button type="button" onClick={stopAudio}><Square /> Stop</button>
                  </div>
                )}
              </section>
            )}

            {activePanel === 'look' && (
              <section className="deck-section" aria-labelledby="look-title">
                <div className="section-heading">
                  <p className="eyebrow">Step 02</p>
                  <h2 id="look-title">Shape the atmosphere</h2>
                  <p>Start with a complete theme, then tune the scene and response.</p>
                </div>

                <div className="control-group">
                  <div className="control-label"><span><Palette /> Theme</span><small>{activeTheme.note}</small></div>
                  <div className="theme-grid">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        className={themeId === theme.id ? 'theme-card is-selected' : 'theme-card'}
                        type="button"
                        onClick={() => selectTheme(theme.id)}
                        aria-pressed={themeId === theme.id}
                      >
                        <span className="theme-swatch" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }} />
                        <span>{theme.name}</span>
                        {themeId === theme.id && <Check />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-label"><span><Sparkles /> Scene</span><small>16 reactive renderers</small></div>
                  <div className="scene-grid">
                    {SCENES.map(([id, label]) => (
                      <button
                        key={id}
                        className={currentScene === id ? 'is-selected' : ''}
                        type="button"
                        onClick={() => setCurrentScene(id)}
                        aria-pressed={currentScene === id}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span><WandSparkles /> Fine tune</span>
                    <button className="text-button" type="button" onClick={() => selectTheme(themeId)}><RotateCcw /> Reset palette</button>
                  </div>
                  <div className="color-row">
                    <label><span>Primary</span><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /><code>{primaryColor}</code></label>
                    <label><span>Secondary</span><input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} /><code>{secondaryColor}</code></label>
                  </div>
                  <label className="range-control">
                    <span><span>Sensitivity</span><output>{sensitivity.toFixed(1)}×</output></span>
                    <input type="range" min="0.5" max="3" step="0.1" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
                  </label>
                  <label className="range-control">
                    <span><span>Smoothing</span><output>{Math.round(smoothing * 100)}%</output></span>
                    <input type="range" min="0" max="0.99" step="0.01" value={smoothing} onChange={(event) => setSmoothing(Number(event.target.value))} />
                  </label>
                </div>
              </section>
            )}

            {activePanel === 'export' && (
              <section className="deck-section" aria-labelledby="export-title">
                <div className="section-heading">
                  <p className="eyebrow">Step 03</p>
                  <h2 id="export-title">Capture the performance</h2>
                  <p>Record the canvas and active audio together as a shareable WebM video.</p>
                </div>

                <div className="record-card">
                  <div className="record-card-icon"><Video /></div>
                  <div><strong>{isRecording ? 'Recording in progress' : recordedVideoUrl ? 'Your recording is ready' : 'Ready when the signal is'}</strong><span>{isRecording ? formatTime(recordingTime) : audioSource === 'none' ? 'Choose an audio source first.' : `${sceneName} · ${activeTheme.name}`}</span></div>
                </div>

                {!isRecording ? (
                  <button className="record-button" type="button" disabled={audioSource === 'none'} onClick={startRecording}>
                    <span className="record-dot" /> {recordedVideoUrl ? 'Record another take' : 'Start recording'}
                  </button>
                ) : (
                  <button className="stop-record-button" type="button" onClick={stopRecording}><Square /> Stop and process</button>
                )}

                {recordedVideoUrl && !isRecording && (
                  <div className="recording-result">
                    <video src={recordedVideoUrl} controls playsInline />
                    <button className="download-button" type="button" onClick={handleDownload}><Download /> Download WebM</button>
                  </div>
                )}

                <div className="export-notes">
                  <p><Gauge /> <span><strong>30 FPS WebM</strong>Balanced quality and browser compatibility.</span></p>
                  <p><Check /> <span><strong>Local processing</strong>Your media never leaves this device.</span></p>
                </div>
              </section>
            )}
          </div>

          <footer className="deck-status" role="status" aria-live="polite">
            <span className={audioSource !== 'none' ? 'status-light is-live' : 'status-light'} />
            <p>{message}</p>
          </footer>
        </aside>
      </main>
    </div>
  );
};

export default App;
