
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, PlayerState, MoodAnalysis } from './types';
import { MOCK_PLAYLIST } from './constants';
import { analyzeTrackMood } from './services/geminiService';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipForwardIcon, 
  SkipBackIcon, 
  ListIcon, 
  SparklesIcon,
  HomeIcon,
  FullscreenIcon,
  LoopIcon,
  FitIcon,
  SpeedIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon
} from './components/Icons';
import PlaylistModal from './components/PlaylistModal';

type FitMode = 'contain' | 'cover' | 'original';

const Tooltip: React.FC<{ text: string, position?: 'top' | 'bottom' }> = ({ text, position = 'top' }) => (
  <div className={`absolute left-1/2 -translate-x-1/2 px-2 py-1 glass rounded-lg 
    opacity-0 pointer-events-none transition-all duration-300 z-[70] 
    text-[8px] font-black uppercase tracking-[0.1em] text-white/80 whitespace-nowrap shadow-xl border-white/10
    group-hover/btn:opacity-100
    ${position === 'top' 
      ? 'bottom-full mb-2 translate-y-1 group-hover/btn:translate-y-0' 
      : 'top-full mt-2 -translate-y-1 group-hover/btn:translate-y-0'
    }`}>
    {text}
  </div>
);

const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[]>(MOCK_PLAYLIST);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.IDLE);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [prevVolume, setPrevVolume] = useState(80);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [mood, setMood] = useState<MoodAnalysis | null>(null);
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [videoFit, setVideoFit] = useState<FitMode>('cover');
  const [isDragging, setIsDragging] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: string;
    icon?: string;
    label?: string;
    value?: number;
  }>({ visible: false, type: '' });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);
  const overlayTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const dragCounter = useRef(0);

  const startOverlayTimer = useCallback(() => {
    if (overlayTimeoutRef.current) window.clearTimeout(overlayTimeoutRef.current);
    setShowVideoOverlay(true);
    if (playerState === PlayerState.PLAYING) {
      overlayTimeoutRef.current = window.setTimeout(() => {
        setShowVideoOverlay(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  }, [playerState]);

  const triggerFeedback = useCallback((type: string, options?: { icon?: string, label?: string, value?: number }) => {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ 
      visible: true, 
      type, 
      icon: options?.icon, 
      label: options?.label, 
      value: options?.value 
    });
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(prev => ({ ...prev, visible: false }));
    }, 1200);
  }, []);

  const handleResetToIdle = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setCurrentTrack(null);
    setPlayerState(PlayerState.IDLE);
    setMood(null);
    setProgress(0);
    setCurrentTime(0);
    triggerFeedback('reset', { icon: '🧼', label: 'Ethereal Cleanse' });
  }, [triggerFeedback]);

  const handleTrackSelect = useCallback((track: Track) => {
    setError(null);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setCurrentTrack(track);
    setPlayerState(PlayerState.LOADING);
    setProgress(0);
    setCurrentTime(0);
    setPlaybackRate(1);
    setShowSpeedMenu(false);
    setShowVideoOverlay(true);
  }, []);

  const handleAddLocalFiles = useCallback((files: FileList) => {
    const newTracks: Track[] = Array.from(files)
      .filter(file => file.type.startsWith('video/') || file.type.startsWith('audio/'))
      .map((file) => ({
        id: `local-${Math.random().toString(36).substr(2, 9)}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Local Content",
        album: "Gallery",
        coverUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop",
        audioUrl: URL.createObjectURL(file),
        duration: 0,
        type: file.type.startsWith('video/') ? 'video' : 'audio',
      }));
    
    if (newTracks.length > 0) {
      setPlaylist((prev) => [...prev, ...newTracks]);
      triggerFeedback('import', { icon: '📂', label: 'Accepted' });
      handleTrackSelect(newTracks[0]);
    }
  }, [handleTrackSelect, triggerFeedback]);

  const handleAddUrl = useCallback((url: string) => {
    if (!url.startsWith('http')) return;
    const newTrack: Track = {
      id: `url-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Remote Essence',
      artist: 'Network Stream',
      album: 'Cloud',
      coverUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop",
      audioUrl: url,
      duration: 0,
      type: 'video',
    };
    setPlaylist((prev) => [...prev, newTrack]);
    triggerFeedback('url', { icon: '🌐', label: 'Bound' });
    handleTrackSelect(newTrack);
  }, [handleTrackSelect, triggerFeedback]);

  const togglePlay = useCallback(() => {
    const media = videoRef.current;
    if (!currentTrack && playlist.length > 0) {
      handleTrackSelect(playlist[0]);
      return;
    }
    if (!media || error) return;

    if (playerState === PlayerState.PLAYING) {
      media.pause();
      setPlayerState(PlayerState.PAUSED);
      triggerFeedback('pause', { icon: '⏸️', label: 'Paused' });
      setShowVideoOverlay(true);
    } else {
      media.play().catch(e => {
        console.error("Playback failed:", e);
        setError("Playback restricted.");
      });
      setPlayerState(PlayerState.PLAYING);
      triggerFeedback('play', { icon: '▶️', label: 'Flowing' });
      startOverlayTimer();
    }
  }, [playerState, error, currentTrack, playlist, handleTrackSelect, triggerFeedback, startOverlayTimer]);

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    const currentIndex = currentTrack ? playlist.findIndex(t => t.id === currentTrack.id) : -1;
    const nextIndex = (currentIndex + 1) % playlist.length;
    handleTrackSelect(playlist[nextIndex]);
    triggerFeedback('next', { icon: '⏭️', label: 'Next' });
  }, [currentTrack, playlist, handleTrackSelect, triggerFeedback]);

  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    const currentIndex = currentTrack ? playlist.findIndex(t => t.id === currentTrack.id) : 0;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    handleTrackSelect(playlist[prevIndex]);
    triggerFeedback('prev', { icon: '⏮️', label: 'Back' });
  }, [currentTrack, playlist, handleTrackSelect, triggerFeedback]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const media = videoRef.current;
    if (media && isFinite(media.duration) && media.duration > 0) {
      media.currentTime = (val / 100) * media.duration;
      setProgress(val);
    }
  };

  const updateVolume = (newVol: number) => {
    const clampedVol = Math.max(0, Math.min(100, newVol));
    setVolume(clampedVol);
    if (videoRef.current) videoRef.current.volume = clampedVol / 100;
    return clampedVol;
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      updateVolume(0);
      triggerFeedback('mute', { icon: '🔇', label: 'Silent' });
    } else {
      updateVolume(prevVolume > 0 ? prevVolume : 50);
      triggerFeedback('unmute', { icon: '🔊', label: 'Resounding' });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = updateVolume(parseInt(e.target.value));
    triggerFeedback('volume', { value: v });
  };

  const toggleFullscreen = useCallback(() => {
    if (appContainerRef.current) {
      if (!document.fullscreenElement) {
        appContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Fullscreen error: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleVideoInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    if (e.detail === 2) {
      if (x < width * 0.3) {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          triggerFeedback('seek', { icon: '⏪', label: '-10s' });
        }
      } else if (x > width * 0.7) {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          triggerFeedback('seek', { icon: '⏩', label: '+10s' });
        }
      } else {
        toggleFullscreen();
      }
    } else if (e.detail === 1) {
      togglePlay();
    }
  };

  // Efek buat AI Mood Analysis - Pake debounce 2.5s biar Gemini-nya nggak gampang 'basah' kena request.
  useEffect(() => {
    if (!currentTrack) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        const analysis = await analyzeTrackMood(currentTrack.title, currentTrack.artist);
        setMood(analysis);
      } catch (e) {
        console.error("Mood analysis debounce error:", e);
      }
    }, 2500); // 2.5 detik biar nggak gampang capek servernya.

    return () => clearTimeout(timeoutId);
  }, [currentTrack]);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer?.items?.length) setIsDragging(true); };
    const handleDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0; if (e.dataTransfer?.files?.length) handleAddLocalFiles(e.dataTransfer.files); };
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleAddLocalFiles]);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackRate; }, [playbackRate, currentTrack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const media = videoRef.current;
      if (!media) return;

      if (e.code === 'Escape') { 
        e.preventDefault(); 
        handleResetToIdle(); 
        return; 
      }

      switch (e.code) {
        case 'Space': 
          e.preventDefault(); 
          togglePlay(); 
          break;
        case 'ArrowLeft': 
          e.preventDefault(); 
          const seekBack = e.ctrlKey ? 30 : 5;
          media.currentTime = Math.max(0, media.currentTime - seekBack);
          triggerFeedback('seek', { icon: '⏪', label: `-${seekBack}s` });
          break;
        case 'ArrowRight': 
          e.preventDefault(); 
          const seekForward = e.ctrlKey ? 30 : 5;
          media.currentTime = Math.min(media.duration, media.currentTime + seekForward);
          triggerFeedback('seek', { icon: '⏩', label: `+${seekForward}s` });
          break;
        case 'ArrowUp': 
          e.preventDefault(); 
          const volUp = updateVolume(volume + 5);
          triggerFeedback('volume', { value: volUp });
          break;
        case 'ArrowDown': 
          e.preventDefault(); 
          const volDown = updateVolume(volume - 5);
          triggerFeedback('volume', { value: volDown });
          break;
        case 'KeyF': 
          e.preventDefault(); 
          toggleFullscreen(); 
          break;
        case 'KeyM': 
          e.preventDefault(); 
          toggleMute(); 
          break;
        case 'BracketRight':
          e.preventDefault();
          handleNext();
          break;
        case 'BracketLeft':
          e.preventDefault();
          handlePrev();
          break;
      }
      startOverlayTimer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, volume, prevVolume, handleResetToIdle, triggerFeedback, startOverlayTimer, handleNext, handlePrev]);

  useEffect(() => {
    const media = videoRef.current;
    if (media && currentTrack?.audioUrl) {
      setPlayerState(PlayerState.LOADING);
      media.src = currentTrack.audioUrl;
      media.load();
      media.volume = volume / 100;
      const onCanPlay = () => { 
        setPlayerState(PlayerState.PLAYING); 
        media.play().catch(() => setPlayerState(PlayerState.PAUSED));
        startOverlayTimer();
      };
      media.addEventListener('canplay', onCanPlay, { once: true });
      return () => media.removeEventListener('canplay', onCanPlay);
    }
  }, [currentTrack, volume]);

  useEffect(() => {
    const video = videoRef.current;
    const onTimeUpdate = (e: Event) => {
      const el = e.target as HTMLMediaElement;
      if (isFinite(el.duration) && el.duration > 0) {
        setProgress((el.currentTime / el.duration) * 100);
        setCurrentTime(el.currentTime);
      }
    };
    const onEnded = () => isLooping ? (videoRef.current!.currentTime = 0, videoRef.current!.play()) : handleNext();
    video?.addEventListener('timeupdate', onTimeUpdate);
    video?.addEventListener('ended', onEnded);
    return () => {
      video?.removeEventListener('timeupdate', onTimeUpdate);
      video?.removeEventListener('ended', onEnded);
    };
  }, [handleNext, isLooping]);

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cycleFitMode = () => {
    const modes: FitMode[] = ['contain', 'cover', 'original'];
    const nextIndex = (modes.indexOf(videoFit) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setVideoFit(nextMode);
    const labels = { contain: 'Letterbox', cover: 'Immersive', original: 'Pure' };
    const icons = { contain: '🖼️', cover: '🧴', original: '📏' };
    triggerFeedback('fit', { icon: icons[nextMode], label: labels[nextMode] });
  };

  const videoStyle = (): React.CSSProperties => {
    switch (videoFit) {
        case 'cover': return { objectFit: 'cover', width: '100%', height: '100%' };
        case 'original': return { objectFit: 'none', width: 'auto', height: 'auto', minWidth: '100%', minHeight: '100%' };
        default: return { objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' };
    }
  };

  return (
    <div ref={appContainerRef} className="relative w-full h-screen overflow-hidden flex flex-col bg-black text-white selection:bg-rose-500/30 font-sans">
      
      {/* Background Layer - Glowing fluid vibes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute inset-0 bg-[#020617]" />
         <div className="absolute top-[-20%] left-[-15%] w-[110%] h-[110%] rounded-full bg-purple-900/10 mix-blend-screen filter blur-[120px] animate-plasma" />
         <div className="absolute bottom-[-30%] right-[-15%] w-[100%] h-[100%] rounded-full bg-rose-900/10 mix-blend-screen filter blur-[120px] animate-plasma" style={{ animationDirection: 'reverse', animationDuration: '40s' }} />
         <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 opacity-70" />
      </div>

      {/* Global Drop Zone Overlay */}
      <div className={`fixed inset-0 z-[200] flex items-center justify-center transition-all duration-700 pointer-events-none ${isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
        <div className="absolute inset-0 bg-rose-600/10 backdrop-blur-[80px]" />
        <div className="relative z-10 flex flex-col items-center gap-8 p-12 sm:p-16 rounded-[4rem] border-4 border-dashed border-rose-500/40 bg-white/5 animate-pulse">
          <span className="text-6xl">🔞</span>
          <div className="text-center">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 text-white animate-shine">Feed Your Desires</h3>
            <p className="text-rose-500 font-black uppercase tracking-[0.4em] text-[10px]">Drop files to begin...</p>
          </div>
        </div>
      </div>

      <main 
        className="relative z-10 w-full h-full flex flex-col items-center"
        onMouseMove={startOverlayTimer}
        onTouchStart={startOverlayTimer}
      >
        
        {/* TOP STATUS BAR */}
        <div className={`fixed top-6 sm:top-8 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto min-w-[280px] flex items-center justify-center gap-4 px-6 py-3 glass-dark rounded-full border-white/10 shadow-2xl z-[80] transition-all duration-700 
          ${(!showVideoOverlay && playerState === PlayerState.PLAYING) || playerState === PlayerState.IDLE ? 'opacity-0 -translate-y-10 scale-90 pointer-events-none' : 'opacity-100 translate-y-0 scale-100 pointer-events-auto'}`}>
          <div className="relative group/btn">
            <button onClick={(e) => { e.stopPropagation(); handleResetToIdle(); }} className="p-2 text-white/40 hover:text-white transition-all">
              <HomeIcon className="w-5 h-5" />
            </button>
            <Tooltip text="Reset Soul" position="bottom" />
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-4 h-4 text-rose-400" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20 leading-none mb-1">Atmosphere</span>
              <span className="text-[10px] font-black tracking-tight text-white/80 leading-none truncate max-w-[120px]">{mood?.mood || 'Tuning...'}</span>
            </div>
          </div>
        </div>

        {/* MEDIA STAGE */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
          
          {playerState === PlayerState.IDLE && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-1000 z-50 px-6">
               <div className="relative mb-6">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] h-[250%] bg-rose-600 blur-[140px] opacity-20 animate-throb pointer-events-none" />
                  <h1 className="relative text-6xl sm:text-[10rem] font-black italic leading-none animate-shine tracking-tighter">
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/10">LUMINA</span>
                  </h1>
               </div>
               <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.8em] text-rose-500/50 mb-12 ml-[0.8em]">Deeply Seductive Playback</p>
               <button 
                  onClick={() => setIsPlaylistOpen(true)}
                  className="group/main-btn relative px-12 sm:px-16 py-4 sm:py-5 rounded-full overflow-hidden transition-all hover:scale-110 active:scale-95 shadow-2xl"
               >
                  <div className="absolute inset-0 bg-white group-hover/main-btn:bg-rose-500 transition-all duration-500" />
                  <span className="relative text-[10px] font-black uppercase tracking-[0.3em] text-black group-hover/main-btn:text-white transition-all duration-500 ml-[0.3em]">Ignite Senses</span>
               </button>
            </div>
          )}

          <video ref={videoRef} className={`relative z-10 transition-all duration-1000 w-full h-full pointer-events-none ${playerState === PlayerState.IDLE ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`} style={videoStyle()} onClick={handleVideoInteraction} crossOrigin="anonymous" />

          {/* INTERACTION OVERLAY */}
          <div className={`absolute inset-0 z-20 flex flex-col transition-all duration-500 ${showVideoOverlay && playerState !== PlayerState.IDLE ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <div className="flex-1 cursor-pointer" onClick={handleVideoInteraction} />
             
             {/* SIDE ACTIONS */}
             <div className="absolute top-24 sm:top-8 right-6 sm:right-8 flex flex-col gap-3">
                {[
                  { id: 'speed', icon: <SpeedIcon className="w-5 h-5" />, active: playbackRate !== 1, action: (e: any) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); } },
                  { id: 'fit', icon: <FitIcon className="w-5 h-5" />, active: videoFit !== 'contain', action: (e: any) => { e.stopPropagation(); cycleFitMode(); } },
                  { id: 'full', icon: <FullscreenIcon className="w-5 h-5" />, active: false, action: (e: any) => { e.stopPropagation(); toggleFullscreen(); } }
                ].map((btn) => (
                  <div key={btn.id} className="relative group/btn">
                    <button onClick={btn.action} className={`p-3.5 sm:p-4 glass-dark rounded-2xl transition-all border border-white/5 shadow-2xl ${btn.active ? 'text-rose-400 border-rose-500/30' : 'text-white/30 hover:text-white'}`}>
                      {btn.icon}
                    </button>
                    {btn.id === 'speed' && showSpeedMenu && (
                      <div className="absolute top-0 right-full mr-3 p-1 glass-dark rounded-2xl border border-white/10 flex flex-row gap-0.5 z-50 animate-in slide-in-from-right-2 duration-300">
                        {[0.5, 1, 1.5, 2].map(rate => (
                          <button key={rate} onClick={() => { setPlaybackRate(rate); setShowSpeedMenu(false); triggerFeedback('speed', { icon: '⚡', label: `${rate}x` }); }} className={`px-3 py-2 text-[9px] font-black rounded-xl transition-all ${playbackRate === rate ? 'bg-white text-black' : 'hover:bg-white/10 text-white/40'}`}>
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
             </div>

             <div className="bg-gradient-to-t from-black via-black/30 to-transparent p-10 sm:p-20 pt-40 pointer-events-none">
                <div className="max-w-4xl mx-auto">
                   <h2 className="text-4xl sm:text-7xl font-black tracking-tighter mb-2 drop-shadow-2xl truncate">{currentTrack?.title || ''}</h2>
                   <p className="text-rose-500/70 font-black uppercase text-[10px] sm:text-[12px] tracking-[0.5em] ml-1">{currentTrack?.artist || ''}</p>
                </div>
             </div>
          </div>
        </div>

        {/* HUD FEEDBACK */}
        <div className={`fixed inset-0 flex items-center justify-center z-[150] pointer-events-none transition-all duration-500 ${feedback.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
             {feedback.type === 'volume' ? (
                <div className="glass-dark px-10 py-6 rounded-[2.5rem] flex flex-col items-center gap-4 border-white/10 shadow-2xl">
                   <div className="flex items-center gap-4">
                     <span className="text-2xl">{feedback.value === 0 ? '🔇' : '🔊'}</span>
                     <span className="text-3xl font-black tracking-tighter">{feedback.value}%</span>
                   </div>
                   <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${feedback.value}%` }} />
                   </div>
                </div>
             ) : (
                <div className="relative glass-dark border-rose-500/20 border px-12 py-6 rounded-[3rem] shadow-2xl flex flex-col items-center gap-3">
                   <span className="text-4xl animate-bounce">{feedback.icon}</span>
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">{feedback.label}</span>
                </div>
             )}
        </div>

        {/* DYNAMIC CONTROL CONSOLE */}
        <div className={`fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-full px-6 sm:px-10 transition-all duration-700 z-[90] max-w-5xl
          ${showVideoOverlay && playerState !== PlayerState.IDLE ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
          <div className="glass-dark rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 shadow-2xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-6 animate-erotic">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-10">
               
               <div className="flex items-center gap-3">
                 <button onClick={handlePrev} className="p-2 text-white/20 hover:text-white transition-all"><SkipBackIcon className="w-6 h-6" /></button>
                 <button onClick={togglePlay} className="bg-white text-black w-14 h-14 sm:w-18 sm:h-18 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl">
                   {playerState === PlayerState.PLAYING ? <PauseIcon className="w-6 h-6 sm:w-8 sm:h-8" /> : <PlayIcon className="w-6 h-6 sm:w-8 sm:h-8 ml-1" />}
                 </button>
                 <button onClick={handleNext} className="p-2 text-white/20 hover:text-white transition-all"><SkipForwardIcon className="w-6 h-6" /></button>
               </div>

               <div className="flex-1 w-full flex flex-col gap-2.5">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-white/30 tracking-widest">{formatTime(currentTime)}</span>
                    <span className="text-[9px] font-black text-white/30 tracking-widest">{formatTime(videoRef.current?.duration || 0)}</span>
                 </div>
                 <div className="relative h-1.5 bg-white/5 rounded-full flex items-center group/progress cursor-pointer">
                    <input type="range" min="0" max="100" step="0.1" value={progress} onChange={handleProgressChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                    <div className="absolute inset-0 h-full bg-white/10 rounded-full" />
                    <div className="relative h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-2xl scale-0 group-hover/progress:scale-100 transition-transform" />
                    </div>
                 </div>
               </div>

               <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-2xl">
                    <button onClick={toggleMute} className="text-white/30 hover:text-white">{volume === 0 ? <VolumeMuteIcon className="w-5 h-5" /> : <VolumeHighIcon className="w-5 h-5" />}</button>
                    <div className="w-20 h-1 bg-white/10 rounded-full relative flex items-center group/vol">
                       <input type="range" min="0" max="100" value={volume} onChange={handleVolumeChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                       <div className="h-full bg-rose-500 rounded-full" style={{ width: `${volume}%` }} />
                    </div>
                  </div>

                  <button onClick={() => { const nl = !isLooping; setIsLooping(nl); triggerFeedback('loop', { icon: '🔁', label: nl ? 'Loop: On' : 'Loop: Off' }); }} className={`p-3.5 rounded-2xl transition-all border ${isLooping ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-inner' : 'bg-white/5 text-white/20 border-transparent hover:text-white'}`}>
                    <LoopIcon className="w-5 h-5" />
                  </button>
                  
                  <button onClick={() => setIsPlaylistOpen(true)} className="bg-rose-600 text-white p-3.5 sm:p-4 rounded-2xl transition-all hover:bg-rose-500 hover:scale-105 active:scale-95">
                    <ListIcon className="w-6 h-6" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </main>

      <PlaylistModal isOpen={isPlaylistOpen} onClose={() => setIsPlaylistOpen(false)} tracks={playlist} currentTrackId={currentTrack?.id || ''} onTrackSelect={handleTrackSelect} onAddFiles={handleAddLocalFiles} onAddUrl={handleAddUrl} />
    </div>
  );
};

export default App;
