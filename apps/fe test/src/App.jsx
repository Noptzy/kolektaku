import { useState, useEffect, useRef } from 'react'
import ollama from 'ollama/browser'
import HlsPlayer from './components/HlsPlayer'
import './App.css'

const headers = {
  'Referer': 'https://rapid-cloud.co/',
  'Origin': 'https://rapid-cloud.co',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
};

function App() {
  const [jsonInput, setJsonInput] = useState("");

  const [url, setUrl] = useState("");
  const [tracks, setTracks] = useState([]);
  const [intro, setIntro] = useState(null);
  const [outro, setOutro] = useState(null);
  const [error, setError] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationMode, setTranslationMode] = useState('Google'); // 'AI' or 'Google', default Google
  const [translationReady, setTranslationReady] = useState(true); // Gate: video waits until translation is ready
  const translationStartedRef = useRef(false); // Track if translation has started
  const translationIdRef = useRef(0); // Track unique translation session IDs
  const translatedCueIndicesRef = useRef(new Set()); // Track translated cues natively
  const currentCuesRef = useRef([]); // Ref to hold current cues for access in callbacks
  const currentTranslateControllerRef = useRef(null);
  const translatingWindowRef = useRef(-1);

  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':');
    if (parts.length === 3) {
      // HH:MM:SS.mmm
      const secParts = parts[2].split('.');
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(secParts[0] || '0');
    } else if (parts.length === 2) {
      // MM:SS.mmm
      const secParts = parts[1].split('.');
      return parseInt(parts[0]) * 60 + parseInt(secParts[0] || '0');
    }
    return 0;
  };


  useEffect(() => {
    // Increment ID to invalidate any previous running translations immediately
    translationIdRef.current += 1;

    if (!jsonInput.trim()) {
      setUrl("");
      setTracks([]);
      setIntro(null);
      setOutro(null);
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);

      if (parsed.sources && parsed.sources.length > 0) {
        setUrl(parsed.sources[0].file);
      }

      if (parsed.intro) setIntro(parsed.intro);
      if (parsed.outro) setOutro(parsed.outro);

      if (parsed.tracks) {
        let currentTracks = parsed.tracks;

        // Reset translation flag when new JSON is parsed
        translationStartedRef.current = false;

        // Check for Indonesian track
        const hasIndonesian = currentTracks.some(t =>
          t.label && (t.label.toLowerCase().includes('indone') || t.label.toLowerCase().includes('bahasa'))
        );

        if (!hasIndonesian) {
          const englishTrack = currentTracks.find(t =>
            t.label && (t.label.toLowerCase().includes('english') || t.label.toLowerCase().includes('eng'))
          );

          if (englishTrack) {
            translationStartedRef.current = true; // Mark as started
            setTranslationReady(false); // ⚡ Gate video BEFORE it renders
            console.log("No Indonesian track found. Triggering translation...");

            // Pass the current session ID
            prepareTranslation(englishTrack.file, translationIdRef.current);
          }
        }

        setTracks(prev => {
          // Ensure we don't overwrite if the streaming track is already there (optimization)
          return currentTracks;
        });
      }

      setError(null);
    } catch (e) {
      setError("Invalid JSON format");
    }
  }, [jsonInput]);

  /* Helper to rebuild VTT content from cues array */
  const generateVTTString = (cuesList) => {
    let output = "WEBVTT\n\n";
    cuesList.forEach((c, idx) => {
      output += `${idx + 1}\n${c.timestamp}\n${c.text.join(' ')}\n\n`;
    });
    return output;
  };

  // Track the next window start time (in seconds)
  const nextWindowRef = useRef(0);

  const translateOnDemand = async (currentTime) => {
    if (!translationStartedRef.current || translationMode !== 'Google') return;

    const cues = currentCuesRef.current;
    if (!cues || cues.length === 0) return;

    const WINDOW_SIZE = 300; // 5 minute per window

    // Ensure we start translating at the requested time window
    nextWindowRef.current = Math.floor(currentTime / WINDOW_SIZE) * WINDOW_SIZE;

    const windowStart = nextWindowRef.current;
    const windowEnd = windowStart + WINDOW_SIZE;

    // Find cues in this window
    const cuesToTranslateIndices = [];
    for (let i = 0; i < cues.length; i++) {
      const cueTime = parseTime(cues[i].timestamp.split(' --> ')[0]);
      if (cueTime >= windowStart && cueTime < windowEnd && !translatedCueIndicesRef.current.has(i)) {
        cuesToTranslateIndices.push(i);
      }
    }

    // If no cues in this window, advance and try next window in background
    if (cuesToTranslateIndices.length === 0) {
      nextWindowRef.current = windowEnd;
      console.log(`Window ${windowStart}-${windowEnd}s: no new cues, advancing...`);
      // We know this window is safe, so make sure video isn't blocked on it
      setTranslationReady(true);

      // Check if there's a next window (cues beyond windowEnd exist)
      const hasMore = cues.some(c => parseTime(c.timestamp.split(' --> ')[0]) >= windowEnd);
      if (hasMore) {
        setTimeout(() => translateOnDemand(windowEnd), 100);
      }
      return;
    }

    translatingWindowRef.current = windowStart;
    setIsTranslating(true);
    console.log(`Window ${windowStart}-${windowEnd}s: translating ${cuesToTranslateIndices.length} cues...`);

    const abortController = new AbortController();
    currentTranslateControllerRef.current = abortController;

    // Send all cues in this window as one batch
    const batchData = cuesToTranslateIndices.map(i => ({ index: i, text: cues[i].text }));

    try {
      const stripHtml = (str) => str.replace(/<[^>]*>/g, '').trim();
      const textBlock = batchData.map((c, idx) => `[${idx}] ${stripHtml(c.text.join(' '))}`).join('\n');

      const response = await fetch('http://localhost:3002/translate-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textBlock,
          from: 'en',
          to: 'id'
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        console.error("Translation Failed:", response.status);
        if (translatingWindowRef.current === windowStart) translatingWindowRef.current = -1;
        setIsTranslating(false);
        return;
      }

      const resData = await response.json();
      console.log(`Raw response (first 200 chars):`, resData.text?.substring(0, 200));

      const translatedLines = resData.text.split('\n').filter(line => line.trim() !== '');
      console.log(`Translated lines count: ${translatedLines.length}, batch size: ${batchData.length}`);

      let updatedCount = 0;
      batchData.forEach((item, idx) => {
        let match = translatedLines.find(l => l.includes(`[${idx}]`));
        if (!match && translatedLines[idx]) match = translatedLines[idx];

        if (match) {
          let transText = match.replace(/\[\d+\]\s*/, '').trim();
          if (transText.startsWith('.') || transText.startsWith('-')) transText = transText.replace(/^[\.\-\s]+/, '');

          if (transText && transText !== item.text.join(' ')) {
            cues[item.index].text = [transText];
            translatedCueIndicesRef.current.add(item.index);
            updatedCount++;
          }
        }
      });

      console.log(`Updated ${updatedCount}/${batchData.length} cues`);

      if (updatedCount > 0) {
        // Update Track Blob
        const newBlob = new Blob([generateVTTString(cues)], { type: 'text/vtt' });
        const newUrl = URL.createObjectURL(newBlob);

        setTracks(prev => {
          const others = prev.filter(t => !t.label.includes('Kolektaku AI'));
          return [...others, {
            file: newUrl,
            label: 'Indonesian (Kolektaku AI)',
            kind: 'subtitles',
            default: true
          }];
        });
      }

    } catch (e) {
      if (e.name === 'AbortError') {
        console.log(`Window ${windowStart}-${windowEnd}s: translation aborted.`);
        return; // Don't advance or trigger next window if aborted
      }
      console.error("On-demand translation error:", e);
    }

    if (translatingWindowRef.current === windowStart) {
      translatingWindowRef.current = -1;
    }
    if (currentTranslateControllerRef.current === abortController) {
      currentTranslateControllerRef.current = null;
    }

    setIsTranslating(false);

    // Translation requested for this window is complete, unblock video player
    setTranslationReady(true);

    // Advance to next window
    nextWindowRef.current = windowEnd;

    // 🔥 Background pre-fetch: immediately start translating the NEXT window
    const cuesArr = currentCuesRef.current;
    if (cuesArr) {
      const hasMoreCues = cuesArr.some(c => parseTime(c.timestamp.split(' --> ')[0]) >= windowEnd);
      if (hasMoreCues) {
        console.log(`🔄 Pre-fetching next window ${windowEnd}-${windowEnd + 300}s in background...`);
        setTimeout(() => translateOnDemand(windowEnd), 200);
      } else {
        console.log(`🎉 All windows translated!`);
      }
    }
  };

  const isTranslatingRef = useRef(false);
  const lastHandledWindowRef = useRef(-1);

  const handleTimeUpdate = (time) => {
    if (!translationStartedRef.current || translationMode !== 'Google') return;

    const WINDOW_SIZE = 300;
    const currentWindow = Math.floor(time / WINDOW_SIZE) * WINDOW_SIZE;

    const cues = currentCuesRef.current;
    if (!cues || cues.length === 0) return;

    // --- Already handled this window, skip ---
    if (lastHandledWindowRef.current === currentWindow) return;

    // Check if there are untranslated cues in the current window
    let needsTranslation = false;
    for (let i = 0; i < cues.length; i++) {
      const cueTime = parseTime(cues[i].timestamp.split(' --> ')[0]);
      if (cueTime >= currentWindow && cueTime < currentWindow + WINDOW_SIZE && !translatedCueIndicesRef.current.has(i)) {
        needsTranslation = true;
        break;
      }
    }

    if (!needsTranslation) {
      // Window already translated, unblock and mark as handled
      lastHandledWindowRef.current = currentWindow;
      setTranslationReady(true);
      return;
    }

    // If we're already actively translating THIS exact window, just stay blocked and return
    if (translatingWindowRef.current === currentWindow) return;

    // Different window — abort the old one and prioritize this one
    if (currentTranslateControllerRef.current) {
      console.log("Aborting previous translation to prioritize seeked window: " + currentWindow);
      currentTranslateControllerRef.current.abort();
      currentTranslateControllerRef.current = null;
    }

    // Mark this window as handled to stop re-triggering every second
    lastHandledWindowRef.current = currentWindow;

    // Block video and start translating
    setTranslationReady(false);
    translateOnDemand(time);
  };

  const prepareTranslation = async (vttUrl, sessionId) => {
    try {
      const response = await fetch(vttUrl);
      const text = await response.text();

      // Simple VTT Parser
      const lines = text.split('\n');
      let cues = [];
      let currentCue = null;
      // Support both HH:MM:SS.mmm and MM:SS.mmm formats
      const timestampRegex = /(?:\d{2}:)?\d{2}:\d{2}\.\d{3} --> (?:\d{2}:)?\d{2}:\d{2}\.\d{3}/;

      lines.forEach(line => {
        const trimLine = line.trim();
        if (trimLine.match(timestampRegex)) {
          if (currentCue) cues.push(currentCue);
          currentCue = { timestamp: trimLine, text: [] };
        } else if (currentCue && trimLine && !trimLine.match(/^\d+$/) && trimLine !== 'WEBVTT') {
          currentCue.text.push(trimLine);
        }
      });
      if (currentCue) cues.push(currentCue);

      console.log(`Parsed ${cues.length} subtitle cues.`);

      currentCuesRef.current = JSON.parse(JSON.stringify(cues));
      translatedCueIndicesRef.current = new Set();

      if (translationMode === 'AI') {
        console.log("AI translation mode - pending re-implementation.");
      } else {
        // Google mode: set initial track with English content, translate on-demand
        const initialBlob = new Blob([generateVTTString(currentCuesRef.current)], { type: 'text/vtt' });
        const initialUrl = URL.createObjectURL(initialBlob);
        setTracks(prev => {
          const others = prev.filter(t => !t.label.includes('Indonesian'));
          return [...others, {
            file: initialUrl,
            label: 'Indonesian (Kolektaku AI)',
            kind: 'subtitles',
            default: true
          }];
        });

        translationStartedRef.current = true;
        // Translate the first minute — video will wait for this
        setTranslationReady(false);
        await translateOnDemand(0);
        setTranslationReady(true);
      }

    } catch (e) {
      console.error("Prep failed:", e);
    }
  };

  return (
    <div className="container">
      <h1>Stream Player</h1>

      <div style={{ width: '100%', maxWidth: '800px' }}>

        <div style={{ marginBottom: '20px' }}>
          <p>Paste JSON Configuration:</p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste JSON here..."
            style={{
              width: '100%',
              height: '200px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}
          />
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
        </div>

        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#222', borderRadius: '8px' }}>
          <label style={{ color: '#fff', marginRight: '10px' }}>Translation Mode:</label>
          <select
            value={translationMode}
            onChange={(e) => setTranslationMode(e.target.value)}
            style={{
              padding: '5px',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555'
            }}
          >
            <option value="Google">Kolektaku AI (Fast + Natural)</option>
            <option value="AI">Ollama AI (Slow + Custom)</option>
          </select>
        </div>

        {url && (
          <div className="player-wrapper">
            <HlsPlayer
              src={url}
              headers={headers}
              tracks={tracks}
              onTimeUpdate={handleTimeUpdate}
              waitingForTranslation={!translationReady}
            />
            <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#888' }}>
              <p><strong>Playing:</strong> {url.substring(0, 50)}...</p>
              <p>
                <strong>Subtitles:</strong> {tracks.length} tracks loaded
                {isTranslating && (
                  <span style={{ marginLeft: '10px', color: '#00bcd4' }}>
                    <i className="fas fa-spinner fa-spin"></i> Translating... {translationProgress}%
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
