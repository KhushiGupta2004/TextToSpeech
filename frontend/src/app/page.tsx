"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Music, Settings, Download, Volume2, Loader2, Play, Pause } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [text, setText] = useState("");

  // Audio settings
  const [gender, setGender] = useState("Male");
  const [accent, setAccent] = useState("UK");
  const [pitch, setPitch] = useState(0); // Hz relative
  const [rate, setRate] = useState(-20); // % relative (Slow pace)

  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const lastReqRef = useRef<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      await uploadFile(selectedFile);
    }
  };

  const uploadFile = async (selectedFile: File) => {
    setIsExtracting(true);
    setText("");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await axios.post(`${backendUrl}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setText(res.data.text);
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error.response?.data?.detail || "Failed to extract text. Make sure backend is running and dependencies are installed.";
      alert(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  const generateMainAudio = async (override?: { text?: string, gender?: string, accent?: string, pitch?: number, rate?: number }) => {
    const activeText = override?.text ?? text;
    if (!activeText.trim()) return;

    const activeGender = override?.gender ?? gender;
    const activeAccent = override?.accent ?? accent;
    const activePitch = override?.pitch ?? pitch;
    const activeRate = override?.rate ?? rate;

    // Prevent completely redundant generation if settings are completely identical
    const payloadStr = JSON.stringify({ activeText, activeGender, activeAccent, activePitch, activeRate });
    if (lastReqRef.current === payloadStr) return;
    lastReqRef.current = payloadStr;

    setIsGenerating(true);

    try {
      const pitchStr = activePitch >= 0 ? `+${activePitch}Hz` : `${activePitch}Hz`;
      const rateStr = activeRate >= 0 ? `+${activeRate}%` : `${activeRate}%`;

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await axios.post(`${backendUrl}/tts`, {
        text: activeText,
        gender: activeGender,
        accent: activeAccent,
        pitch: pitchStr,
        rate: rateStr
      });

      const url = `${backendUrl}${res.data.audio_url}`;
      setAudioUrl(url);

      // Auto-play the new audio
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((e) => console.log("Auto-play prevented", e));
        }
      }, 100);
    } catch (error) {
      console.error("Error generating audio:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Debounced auto-generation when text changes
  useEffect(() => {
    if (!text.trim()) return;
    const timeoutId = setTimeout(() => {
      generateMainAudio();
    }, 1500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const downloadText = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAudio = async () => {
    if (!audioUrl) return;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audio_note.mp3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading audio:", error);
      alert("Failed to download audio track.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center p-6 md:p-12 selection:bg-indigo-500/30 font-sans relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-10 w-full max-w-4xl"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 text-transparent bg-clip-text">
          SonicScribe
        </h1>
        <p className="text-neutral-400 text-lg md:text-xl">
          Transform handwritten notes, PDFs, and images into actionable text and lifelike speech.
        </p>
      </motion.div>

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4 text-indigo-400">
              <Upload size={24} />
              <h2 className="text-xl font-semibold text-white">Upload Document</h2>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 hover:border-indigo-500 bg-neutral-900/50 hover:bg-neutral-800/50 transition-all rounded-2xl h-40 cursor-pointer group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.png,.jpg,.jpeg,.pdf,.docx"
                className="hidden"
              />
              <Upload className="text-neutral-500 group-hover:text-indigo-400 transition-colors mb-3" size={32} />
              <p className="text-neutral-300 font-medium">Click or drag file to upload</p>
              <p className="text-neutral-500 text-sm mt-1">Supports TXT, PDF, DOCX, PNG, JPG</p>
            </div>
            {file && (
              <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                <FileText className="text-indigo-400" size={20} />
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-purple-400">
                <FileText size={24} />
                <h2 className="text-xl font-semibold text-white">Extracted Text</h2>
              </div>
              {text && (
                <button
                  onClick={downloadText}
                  className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                  title="Download Text"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            {isExtracting ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 border border-neutral-800 bg-neutral-950/50 rounded-2xl">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Extracting text from document...</p>
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Extracted text will appear here. You can also type or edit this text directly..."
                className="flex-1 w-full bg-neutral-950/50 border border-neutral-800 rounded-2xl p-4 text-neutral-200 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none transition-all placeholder:text-neutral-600 custom-scrollbar"
              />
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 text-fuchsia-400">
              <Settings size={24} />
              <h2 className="text-xl font-semibold text-white">Audio Settings</h2>
            </div>

            <div className="space-y-6">
              {/* Gender Select */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Speaker Voice</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (gender !== "Female") {
                        setGender("Female");
                        generateMainAudio({ gender: "Female" });
                      }
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                      gender === "Female"
                        ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600"
                    )}
                  >
                    Female
                  </button>
                  <button
                    onClick={() => {
                      if (gender !== "Male") {
                        setGender("Male");
                        generateMainAudio({ gender: "Male" });
                      }
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                      gender === "Male"
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600"
                    )}
                  >
                    Male
                  </button>
                </div>
              </div>

              {/* Accent Select */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Accent</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "US English", value: "US" },
                    { label: "British", value: "UK" },
                    { label: "Australian", value: "AU" },
                    { label: "Indian", value: "IN" }
                  ].map((acc) => (
                    <button
                      key={acc.value}
                      onClick={() => {
                        if (accent !== acc.value) {
                          setAccent(acc.value);
                          generateMainAudio({ accent: acc.value });
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                        accent === acc.value
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600"
                      )}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Control */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Pitch Control</label>
                  <span className="text-xs text-neutral-500">{pitch > 0 ? `+${pitch}` : pitch}Hz</span>
                </div>
                <input
                  type="range"
                  min="-50" max="50" value={pitch} onChange={(e) => setPitch(Number(e.target.value))}
                  onMouseUp={(e) => generateMainAudio({ pitch: Number(e.currentTarget.value) })}
                  onTouchEnd={(e) => generateMainAudio({ pitch: Number(e.currentTarget.value) })}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-sm"
                />
              </div>

              {/* Rate Control */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Speech Speed</label>
                  <span className="text-xs text-neutral-500">{rate > 0 ? `+${rate}` : rate}%</span>
                </div>
                <input
                  type="range"
                  min="-50" max="100" value={rate} onChange={(e) => setRate(Number(e.target.value))}
                  onMouseUp={(e) => generateMainAudio({ rate: Number(e.currentTarget.value) })}
                  onTouchEnd={(e) => generateMainAudio({ rate: Number(e.currentTarget.value) })}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-sm"
                />
              </div>

              {isGenerating && (
                <div className="w-full mt-4 py-3 rounded-xl bg-neutral-900/80 text-indigo-300 font-medium flex items-center justify-center gap-2 animate-pulse border border-indigo-500/20 shadow-lg absolute bottom-[88px] left-0 translate-y-full z-20">
                  <Loader2 className="animate-spin" size={18} />
                  Applying settings...
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-2xl transition-all",
              !audioUrl && "opacity-50 pointer-events-none"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <Music size={24} />
                <h2 className="text-xl font-semibold text-white">Audio Player</h2>
              </div>
              {audioUrl && (
                <button
                  onClick={downloadAudio}
                  className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                  title="Download Audio Notes"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            <div className="bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
              {audioUrl ? (
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full"
                  autoPlay
                />
              ) : (
                <div className="flex items-center justify-center h-14 text-neutral-600 text-sm font-medium">
                  Generate audio to play
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3f3f46;
          border-radius: 10px;
        }
        audio::-webkit-media-controls-panel {
          background-color: #171717;
        }
        audio::-webkit-media-controls-current-time-display,
        audio::-webkit-media-controls-time-remaining-display {
          color: #fff;
        }
        audio::-webkit-media-controls-play-button,
        audio::-webkit-media-controls-mute-button {
          filter: invert(1);
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%; 
          background: #a855f7;
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
        }
      `}} />
    </div>
  );
}
