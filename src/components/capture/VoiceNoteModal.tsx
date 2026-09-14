import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatDeviceDateTime } from '../../utils/dateFormatter';
import { haptics } from '../../utils/haptics';
import { useToast } from '../ui/Toast';

export interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVoiceNote: (data: {
    title: string;
    duration: number;
    rawText: string;
    summary: string;
    category: string;
    tags: string[];
    audioUrl?: string;
    mimeType?: string;
  }) => void;
}

export const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  isOpen,
  onClose,
  onSaveVoiceNote,
}) => {
  const toast = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [micError, setMicError] = useState<string>('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('Catatan Suara');

  // Real Audio Recording & Web Audio Analyser references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(new Array(15).fill(15));

  // Audio Playback Element
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Speech Recognition reference & recording active flags
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');
  const [speechNotice, setSpeechNotice] = useState<string>('');

  // Timer
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state saat modal dibuka
      const now = new Date();
      const dateStr = formatDeviceDateTime(now);
      setTitle(`Catatan Suara - ${dateStr}`);
      setTranscription('');
      setSummary('');
      setAudioUrl('');
      setHasRecorded(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      accumulatedTranscriptRef.current = '';
      setRecordingSeconds(0);
      setMicError('');
      setSpeechNotice('');
    } else {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  // Update timer during recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 1. Mulai Rekaman Audio Nyata
  const startRecording = async () => {
    setMicError('');
    setSpeechNotice('');
    setTranscription('');
    setSummary('');
    setRecordingSeconds(0);
    setWaveformLevels(new Array(15).fill(15));
    audioChunksRef.current = [];
    accumulatedTranscriptRef.current = '';
    isRecordingRef.current = true;

    try {
      // Dapatkan akses mikrofon nyata
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Inisialisasi MediaRecorder dengan codec yang didukung oleh perangkat
      let recorderOptions: MediaRecorderOptions = {};
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ];
      for (const candidate of mimeCandidates) {
        if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate)) {
          recorderOptions = { mimeType: candidate };
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || recorderOptions.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, {
          type: actualMime,
        });
        audioBlobRef.current = blob;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(250);

      // Inisialisasi Web Audio API Analyser untuk waveform nyata
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateWaveform = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Ambil 15 sampel frekuensi rata-rata
          const step = Math.floor(bufferLength / 15);
          const newLevels = [];
          for (let i = 0; i < 15; i++) {
            const val = dataArray[i * step] || 0;
            // Normalisasi ke rentang 15% - 100%
            const pct = Math.max(15, Math.min(100, (val / 255) * 100));
            newLevels.push(pct);
          }
          setWaveformLevels(newLevels);
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      }

      setIsRecording(true);
      setHasRecorded(false);
    } catch (err: any) {
      console.error('Gagal mengakses mikrofon:', err);
      const errName = err?.name || '';
      const errMsg = err?.message || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setMicError(
          'Izin mikrofon belum diberikan. Pada macOS, buka Pengaturan Sistem > Privasi & Keamanan > Mikrofon dan izinkan SIMPAN. Di Windows, buka Settings > Privacy & Security > Microphone.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setMicError('Perangkat mikrofon tidak terdeteksi. Pastikan mikrofon terpasang pada komputer Anda.');
      } else {
        setMicError(
          `Tidak dapat mengakses mikrofon: ${errName || errMsg || 'Pastikan izin mikrofon telah diberikan di perangkat Anda'}.`
        );
      }
    }
  };

  // 2. Berhenti Rekaman
  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setHasRecorded(true);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Set summary yang bersih dan manusiawi
    setTranscription((prev) => {
      const finalVal = prev.trim() || accumulatedTranscriptRef.current.trim();
      if (!finalVal) {
        setSummary(`Catatan Suara (${formatDuration(recordingSeconds)})`);
        return '';
      }
      setSummary(finalVal.slice(0, 120));
      return finalVal;
    });
  };

  // 3. Putar Ulang Hasil Rekaman Asli
  const togglePlayAudio = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      audioPlayerRef.current = audio;
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    haptics.impactLight();
    cleanup();
    setIsRecording(false);
    setHasRecorded(false);
    setRecordingSeconds(0);
    setAudioUrl('');
    setTranscription('');
    setSummary('');
    setWaveformLevels(new Array(15).fill(15));
  };

  const handleSave = () => {
    haptics.notificationSuccess();
    cleanup();
    const finalVal = transcription.trim() || summary.trim() || `Catatan Suara (${formatDuration(recordingSeconds)})`;
    const actualMime = audioBlobRef.current?.type || 'audio/webm';
    onSaveVoiceNote({
      title: title.trim() || `Catatan Suara - ${formatDuration(recordingSeconds)}`,
      duration: recordingSeconds || 1,
      rawText: finalVal,
      summary: summary || finalVal.slice(0, 120),
      category: category || 'Catatan Suara',
      tags: ['Audio Note', 'Suara', category].filter(Boolean),
      audioUrl: audioUrl || undefined,
      mimeType: actualMime,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rekam Suara" maxWidth="md">
      <div className="space-y-4">
        {micError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{micError}</span>
          </div>
        )}

        {/* Real Waveform & Recorder Center */}
        <div className="flex flex-col items-center justify-center p-6 bg-[#FAF9F6] rounded-3xl border border-stone-200/80 text-center">
          <div className="text-2xl font-bold font-mono text-stone-800 tracking-wider mb-4">
            {formatDuration(recordingSeconds)}
          </div>

          {/* Real Audio Waveform Bars (Didorong oleh AnalyserNode frekuensi mic) */}
          <div className="flex items-center justify-center gap-1.5 h-14 w-full max-w-xs mb-6 px-4">
            {waveformLevels.map((heightPct, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${isRecording
                    ? 'bg-[#165a4c]'
                    : hasRecorded
                      ? 'bg-emerald-400'
                      : 'bg-stone-300'
                  }`}
                style={{
                  height: `${heightPct}%`,
                }}
              />
            ))}
          </div>

          {/* Recording Controls */}
          <div className="flex items-center gap-4">
            {!isRecording && !hasRecorded && (
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-[#165a4c] hover:bg-[#134e48] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#165a4c]/30 transition-transform"
                aria-label="Mulai Merekam Suara Nyata"
              >
                <Mic className="w-7 h-7" />
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-transform animate-pulse"
                aria-label="Berhenti Merekam"
              >
                <Square className="w-6 h-6 fill-white" />
              </button>
            )}

            {hasRecorded && (
              <>
                <button
                  onClick={togglePlayAudio}
                  disabled={!audioUrl}
                  className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-[#165a4c] hover:bg-emerald-100 active:scale-95 flex items-center justify-center shadow-xs transition-transform"
                  aria-label={isPlaying ? 'Jeda' : 'Putar Rekaman Asli'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-[#165a4c]" />
                  ) : (
                    <Play className="w-5 h-5 fill-[#165a4c] ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95 flex items-center justify-center shadow-xs transition-transform"
                  aria-label="Rekam Ulang"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-stone-500 font-medium mt-4">
            {isRecording
              ? 'Merekam suara Anda secara langsung...'
              : hasRecorded
                ? 'Rekaman selesai. Dengarkan atau simpan ke arsip.'
                : 'Ketuk mikrofon untuk mulai merekam.'}
          </p>

          {isRecording && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#165a4c] text-[10px] font-bold mt-2 animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>Mendengarkan suara & mentranskripsi teks...</span>
            </div>
          )}
        </div>

        {/* Details & Notes */}
        {hasRecorded && (
          <div className="space-y-3 animate-fade-in">
            <Input
              label="Judul Rekaman"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul rekaman..."
            />

            {/* Catatan / Deskripsi Tambahan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <span>Catatan / Keterangan (Opsional)</span>
                </label>
                <span className="text-[10px] text-stone-400">
                  {transcription.length} karakter
                </span>
              </div>
              <textarea
                rows={3}
                value={transcription}
                onChange={(e) => {
                  setTranscription(e.target.value);
                  setSummary(e.target.value.slice(0, 120));
                }}
                placeholder="Ketik catatan atau keterangan penting untuk rekaman suara ini..."
                className="w-full px-3.5 py-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium text-stone-800 outline-none focus:border-[#165a4c] resize-none"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="text-xs font-semibold text-stone-700">Kategori</label>
              <div className="flex items-center gap-2 mt-1">
                {['Catatan Suara', 'Ide', 'Rapat', 'Pribadi'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${category === cat
                        ? 'bg-[#165a4c] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasRecorded && !isRecording}
            className="bg-[#165a4c] hover:bg-[#134e48]"
          >
            Simpan ke Arsip
          </Button>
        </div>
      </div>
    </Modal>
  );
};
