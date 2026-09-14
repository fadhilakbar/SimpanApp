import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Volume2,
  Mic,
  Play,
  Pause,
  Copy,
  Share2,
  Download,
  FolderInput,
  Trash2,
  AlignLeft,
  RotateCcw,
  RotateCw,
  Tag as TagIcon,
  FileText,
} from 'lucide-react';
import { ArchiveRecord } from '../../../types/record';
import { PlantBadge } from '../../ui';
import { aiSoundReader } from '../../../services/aiSoundReader';
import { haptics } from '../../../utils/haptics';
import { showConfirm, showSuccess } from '../../../utils/swal';
import { copyToClipboard } from '../../../utils/clipboard';
import { getPlayableAudioUrl, webAudioPlayer } from '../../../services/audioPlayerService';

export interface AudioDetailProps {
  record: ArchiveRecord;
  dateVal: string;
  descriptionVal: string;
  rawTextVal: string;
  tags: string[];
  onOpenMoveModal: () => void;
  onDeleteRecord: (id: string) => void;
  onDownload: () => void;
  onShare: () => void;
}

export const AudioDetail: React.FC<AudioDetailProps> = ({
  record,
  dateVal,
  descriptionVal,
  rawTextVal,
  tags,
  onOpenMoveModal,
  onDeleteRecord,
  onDownload,
  onShare,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSec, setPlaybackSec] = useState<number>(0);
  const [playableSource, setPlayableSource] = useState<string>('');
  const [usingWebAudio, setUsingWebAudio] = useState<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Selesaikan sumber audio ke Blob URL in-memory bebas hambatan HTTP Range
  useEffect(() => {
    let active = true;
    let blobUrlToRevoke = '';

    getPlayableAudioUrl(record).then((url) => {
      if (!active) return;
      if (url) {
        setPlayableSource(url);
        if (url.startsWith('blob:')) {
          blobUrlToRevoke = url;
        }
        // Pre-load audio buffer ke Web Audio API fallback
        webAudioPlayer.load(url).catch(() => {});
      }
    });

    return () => {
      active = false;
      webAudioPlayer.stop();
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
    };
  }, [record]);

  const hasAudioUrl = Boolean(playableSource);

  const [actualDuration, setActualDuration] = useState<number>(
    record.audioDurationSeconds || 0
  );
  const durationSec = actualDuration || record.audioDurationSeconds || 0;
  const formattedDuration = durationSec > 0
    ? `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`
    : '--:--';

  const textContent = rawTextVal || record.summary || record.title;
  const wordCount = textContent ? textContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = textContent.length;

  const togglePlayback = async () => {
    haptics.impactLight();
    if (isPlaying) {
      if (usingWebAudio) {
        webAudioPlayer.pause();
      } else if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (!playableSource) {
        showSuccess('Informasi Audio', 'Berkas rekaman suara asli tidak ditemukan pada arsip ini.');
        return;
      }

      // 1. Coba putar dengan native HTML5 Audio Element terlebih dahulu
      if (audioElementRef.current && !usingWebAudio) {
        try {
          await audioElementRef.current.play();
          setIsPlaying(true);
          return;
        } catch (nativeErr) {
          console.warn('HTML5 Audio playback issue, activating Web Audio API engine:', nativeErr);
        }
      }

      // 2. Fallback ke Web Audio API (Hardware AudioBuffer) jika HTML5 audio terhambat
      setUsingWebAudio(true);
      const isLoaded = await webAudioPlayer.load(playableSource);
      if (isLoaded) {
        const started = webAudioPlayer.play(
          () => {
            setIsPlaying(false);
            setPlaybackSec(0);
          },
          (sec) => {
            setPlaybackSec(sec);
          }
        );
        if (started) {
          setIsPlaying(true);
          return;
        }
      }

      setIsPlaying(false);
      showSuccess('Gagal Memutar Audio', 'Berkas audio asli tidak dapat dimuat atau rusak.');
    }
  };

  // Jump forward / backward 5s
  const jumpTime = (offset: number) => {
    haptics.impactLight();
    const maxT = durationSec > 0 ? durationSec : 99999;
    if (usingWebAudio) {
      const newTime = Math.max(0, Math.min(maxT, playbackSec + offset));
      webAudioPlayer.seek(newTime);
      setPlaybackSec(Math.round(newTime));
    } else if (audioElementRef.current) {
      const newTime = Math.max(0, Math.min(maxT, audioElementRef.current.currentTime + offset));
      audioElementRef.current.currentTime = newTime;
      setPlaybackSec(Math.round(newTime));
    }
  };

  const copyTranscription = async () => {
    haptics.impactLight();
    await copyToClipboard(textContent);
    showSuccess('Transkripsi Disalin', 'Teks transkripsi suara berhasil disalin ke papan klip.');
  };

  const speakTranscriptTTS = () => {
    haptics.impactLight();
    if (!textContent) return;
    aiSoundReader.speak(textContent, () => {
      showSuccess('Selesai', 'Selesai membacakan transkripsi teks.');
    });
  };

  return (
    <div className="space-y-4">
      {/* Real native audio element for pristine original playback */}
      {hasAudioUrl && (
        <audio
          ref={audioElementRef}
          src={playableSource}
          preload="auto"
          onLoadedMetadata={(e) => {
            const dur = Math.round(e.currentTarget.duration);
            if (dur && isFinite(dur) && dur > 0) {
              setActualDuration(dur);
            }
          }}
          onTimeUpdate={(e) => {
            if (!usingWebAudio) {
              setPlaybackSec(Math.round(e.currentTarget.currentTime));
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setPlaybackSec(0);
          }}
          onError={async (e) => {
            console.warn('Native audio tag error, switching to Web Audio API:', e);
            if (isPlaying) {
              setUsingWebAudio(true);
              await webAudioPlayer.load(playableSource);
              webAudioPlayer.play(
                () => {
                  setIsPlaying(false);
                  setPlaybackSec(0);
                },
                (sec) => setPlaybackSec(sec)
              );
            }
          }}
          className="hidden"
        />
      )}

      {/* 1. HERO: Interactive Apple Voice Memo Player Card */}
      <div className="w-full bg-gradient-to-br from-[#13332b] via-[#165a4c] to-[#0d221c] text-white rounded-3xl p-5.5 shadow-xl border border-emerald-600/30 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black text-emerald-200 shadow-xs">
            <Mic className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>MEMO SUARA OFFLINE</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-200 bg-black/25 px-2.5 py-1 rounded-xl border border-white/10">
            {formattedDuration}
          </span>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div className="py-5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-[3px] h-14 w-full px-2 mb-3">
            {[6, 12, 18, 28, 38, 24, 16, 32, 44, 30, 20, 36, 48, 32, 16, 24, 40, 50, 34, 20, 28, 38, 24, 14, 8, 18, 32, 16, 10].map(
              (baseH, i) => {
                const dynamicH = isPlaying
                  ? Math.max(6, baseH * (0.6 + Math.sin(playbackSec * 2 + i * 0.7) * 0.4))
                  : baseH * 0.65;
                return (
                  <div
                    key={i}
                    style={{ height: `${dynamicH}px` }}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isPlaying
                        ? 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.5)]'
                        : 'bg-white/40'
                    }`}
                  />
                );
              }
            )}
          </div>

          {/* Time Counter */}
          <div className="w-full flex items-center justify-between text-xs font-mono text-emerald-200/90 px-1 font-semibold">
            <span>
              {String(Math.floor(playbackSec / 60)).padStart(2, '0')}:
              {String(playbackSec % 60).padStart(2, '0')}
            </span>
            <span>{formattedDuration}</span>
          </div>

          {/* Scrubber bar */}
          <div className="w-full h-2 bg-black/35 rounded-full overflow-hidden mt-2 cursor-pointer relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-200 rounded-full transition-all duration-300"
              style={{ width: `${(playbackSec / durationSec) * 100}%` }}
            />
          </div>

          {/* Controls: Skip Back 5s, Big Play/Pause, Skip Forward 5s */}
          <div className="pt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => jumpTime(-5)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all text-white/80 hover:text-white cursor-pointer"
              aria-label="Mundur 5 detik"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlayback}
              className="w-16 h-16 rounded-full bg-white text-[#165a4c] shadow-xl flex items-center justify-center active:scale-95 hover:scale-105 transition-all cursor-pointer hover:bg-emerald-50"
              aria-label={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-[#165a4c]" />
              ) : (
                <Play className="w-7 h-7 fill-[#165a4c] ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => jumpTime(5)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all text-white/80 hover:text-white cursor-pointer"
              aria-label="Maju 5 detik"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. METADATA INFORMATION CARD */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
            Memo Suara Asli
          </span>
          <h1 className="text-xl font-black text-stone-900 tracking-tight leading-snug mt-1.5">
            {record.title}
          </h1>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-100">
          {/* Waktu Rekam */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Waktu Rekam</span>
              <span className="text-stone-900 font-bold">{dateVal}</span>
            </div>
          </div>

          {/* Durasi */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Durasi Rekaman</span>
              <span className="text-purple-900 font-bold bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200/70 shadow-2xs font-mono">
                {formattedDuration}
              </span>
            </div>
          </div>

          {/* Catatan / Keterangan Memo (Jika Ada) */}
          {descriptionVal && (
            <div className="flex items-start gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-start justify-between gap-3">
                <span className="text-stone-400 font-medium shrink-0">Catatan</span>
                <span className="text-stone-800 font-medium text-right leading-relaxed max-w-[210px]">
                  {descriptionVal}
                </span>
              </div>
            </div>
          )}

          {/* Tag */}
          <div className="flex items-start gap-3 text-xs pt-2 border-t border-stone-100">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <TagIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className="text-stone-400 font-medium">Tag</span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200/80 transition-colors shadow-2xs"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTROL CENTER ACTION BUTTONS */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Putar / Jeda Audio */}
        <button
          type="button"
          onClick={togglePlayback}
          className={`group rounded-2xl p-3 border shadow-2xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white border-purple-600 shadow-md animate-pulse'
              : 'bg-gradient-to-b from-purple-50/90 to-white border-purple-200/90 hover:border-purple-300 hover:shadow-xs'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${
              isPlaying
                ? 'bg-white text-purple-700'
                : 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-purple-500/25'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </div>
          <div className="text-center">
            <h4 className={`text-xs font-bold ${isPlaying ? 'text-white' : 'text-purple-950'}`}>
              {isPlaying ? 'Jeda Suara' : 'Putar Audio'}
            </h4>
            <p className={`text-[9px] font-medium ${isPlaying ? 'text-purple-100' : 'text-purple-700/80'}`}>
              {isPlaying ? 'Sedang Putar...' : 'Dengar Rekaman'}
            </p>
          </div>
        </button>

        {/* Unduh Berkas Audio Asli */}
        <button
          type="button"
          onClick={onDownload}
          className="group bg-gradient-to-b from-emerald-50/90 to-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-600/25 group-hover:scale-105 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-emerald-950">Unduh</h4>
            <p className="text-[9px] text-emerald-700/80 font-medium">Berkas Audio</p>
          </div>
        </button>

        {/* Bagikan */}
        <button
          type="button"
          onClick={onShare}
          className="group bg-gradient-to-b from-teal-50/90 to-white rounded-2xl p-3 border border-teal-200/90 shadow-2xs hover:border-teal-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shadow-teal-500/25 group-hover:scale-105 transition-transform">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-teal-950">Bagikan</h4>
            <p className="text-[9px] text-teal-700/80 font-medium">Berkas Suara</p>
          </div>
        </button>
      </div>

      {/* Row 2 Actions: Pindah & Hapus */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Pindah Kategori */}
        <button
          type="button"
          onClick={onOpenMoveModal}
          className="group bg-gradient-to-b from-amber-50/90 to-white rounded-2xl p-3 border border-amber-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/25 group-hover:scale-105 transition-transform">
            <FolderInput className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-amber-950">Pindah</h4>
            <p className="text-[9px] text-amber-700/80 font-medium">Ganti Kategori</p>
          </div>
        </button>

        {/* Hapus */}
        <button
          type="button"
          onClick={async () => {
            const confirmed = await showConfirm({
              title: 'Hapus Rekaman Suara?',
              text: `Arsip suara "${record.title}" akan dipindahkan ke Sampah.`,
              confirmText: 'Hapus Arsip',
              cancelText: 'Batal',
              isDestructive: true,
            });
            if (confirmed) {
              onDeleteRecord(record.id);
            }
          }}
          className="group bg-gradient-to-b from-rose-50/90 to-white rounded-2xl p-3 border border-rose-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-xs shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-rose-950">Hapus</h4>
            <p className="text-[9px] text-rose-700/80 font-medium">Ke Sampah</p>
          </div>
        </button>
      </div>

      {/* Plant Banner */}
      <div className="pt-2">
        <PlantBadge
          variant="banner"
          text="Rekaman suara Anda tersimpan aman secara offline di perangkat."
        />
      </div>
    </div>
  );
};
