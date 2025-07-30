import React, { useState, useRef, useEffect } from "react";
import "./PitchChanger.css";

function PitchChanger() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [audioPreviewBackup, setAudioPreviewBackup] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [temporaryPlaybackRate, setTemporaryPlaybackRate] = useState(1);
  const [temporaryYouTubeLink, setTemporaryYouTubeLink] = useState(null);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const audioSourceRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
      setAudioPreviewBackup(URL.createObjectURL(file));
    } else if (file) {
      alert("Please select a valid audio file!");
    } else {
      alert("You didn't select anything!");
    }
  };

  const handleClear = () => {
    setAudioFile(null);
    setAudioPreview(null);
    setAudioPreviewBackup(null);
    URL.revokeObjectURL(audioPreview);
  };

  const renderPitchOfAudioPreview = async (pitch) => {
    if (!audioBufferRef.current) return;

    const originalLength = audioBufferRef.current.length;
    const sampleRate = audioBufferRef.current.sampleRate;
    const adjustedLength = Math.ceil(originalLength / pitch);

    const offlineContext = new OfflineAudioContext(
      2,
      adjustedLength,
      sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = pitch;

    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    const blob = bufferToWave(renderedBuffer, renderedBuffer.length);

    const url = URL.createObjectURL(blob);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(url);
  };

  const handleTemporaryLinkChange = (e) => {
    setTemporaryYouTubeLink(e.target.value);
  };

  const handleYouTubeLink = async (youtubeLink) => {
    try {
      const response = await fetch(
        "https://backend-for-youtube-to-mp3-data-handling.onrender.com/convert",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: youtubeLink }),
        }
      );

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioPreview(url);
    } catch (error) {
      console.error("Error converting YouTube link:", error);
    }
  };

  useEffect(() => {
    if (!audioFile) return;

    const initializeAudio = async () => {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      const response = await fetch(audioPreviewBackup);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );
      audioBufferRef.current = audioBuffer;
    };

    initializeAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioFile, audioPreview]);

  const playSound = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = playbackRate;
    source.connect(audioContextRef.current.destination);
    source.start();
    audioSourceRef.current = source;

    source.onended = () => {
      audioSourceRef.current = null;
    };
  };

  const downloadModifiedAudio = async () => {
    if (!audioBufferRef.current) return;

    const originalLength = audioBufferRef.current.length;
    const sampleRate = audioBufferRef.current.sampleRate;
    const adjustedLength = Math.ceil(originalLength / playbackRate);

    const offlineContext = new OfflineAudioContext(
      2,
      adjustedLength,
      sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = playbackRate;

    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    const blob = bufferToWave(renderedBuffer, renderedBuffer.length);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${audioFile.name} - Pitch ${playbackRate}.wav`;
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const bufferToWave = (buffer, length) => {
    const numOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const formatLength = 44 + length * numOfChannels * 2;
    const bufferArray = new ArrayBuffer(formatLength);
    const view = new DataView(bufferArray);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + length * numOfChannels * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * 2, true);
    view.setUint16(32, numOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, length * numOfChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i] * 32767;
        view.setInt16(offset, sample < 0 ? sample : sample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  };

  return (
    <>
      <div>
        {/* <h2>Pitch Changer</h2> */}
        <input type="file" accept="audio/*" onChange={handleFileChange} />
        {/* <input type="text" onChange={handleTemporaryLinkChange} />
        <button
          onClick={() => {
            handleYouTubeLink(temporaryYouTubeLink);
          }}
        >
          Attempt To Process
        </button> */}
        {audioPreview && (
          <div>
            <audio className="audio" key={audioPreview} controls>
              <source src={audioPreview} type={audioFile?.type} />
              Your browser does not support the audio element.
            </audio>

            {/* <button onClick={handleClear}>Remove</button> */}
          </div>
        )}
        {audioFile && (
          <div>
            <label>Pitch: </label>
            <input
              type="text"
              // min="0.5"
              // max="2"
              // step="0.05"
              // value={playbackRate}
              onChange={(e) =>
                setTemporaryPlaybackRate(parseFloat(e.target.value))
              }
            />
            <button
              data-rate={temporaryPlaybackRate}
              onClick={() => {
                setPlaybackRate(temporaryPlaybackRate);
                renderPitchOfAudioPreview(temporaryPlaybackRate);
              }}
            >
              Set Pitch
            </button>
            <button onClick={downloadModifiedAudio}>
              Download Modified Audio
            </button>
            <div>
              <span>
                Pitch {playbackRate} (Sound playing at {playbackRate * 100}%
                original pitch and tempo.)
              </span>
              {/* <button onClick={playSound}>Play</button> */}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default PitchChanger;
