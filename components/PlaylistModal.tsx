
import React, { useRef, useState } from 'react';
import { Track } from '../types';
import { LinkIcon } from './Icons';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrackId: string;
  onTrackSelect: (track: Track) => void;
  onAddFiles?: (files: FileList) => void;
  onAddUrl?: (url: string) => void;
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({ 
  isOpen, 
  onClose, 
  tracks, 
  currentTrackId, 
  onTrackSelect,
  onAddFiles,
  onAddUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');

  if (!isOpen) return null;

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim() && onAddUrl) {
      onAddUrl(urlInput.trim());
      setUrlInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden glass-dark rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-white/10">
        
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Library</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-wider">{tracks.length} Contents</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 text-xs">✕</button>
          </div>
        </div>
        
        {/* Track List */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2 custom-scrollbar">
          {tracks.length > 0 ? (
            tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => { onTrackSelect(track); onClose(); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group border ${
                  currentTrackId === track.id ? 'bg-white/10 border-white/20 shadow-lg scale-[1.01]' : 'hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="relative shrink-0 overflow-hidden rounded-xl shadow border border-white/10 w-16 h-10 bg-black">
                  <img src={track.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[4px] border-l-white border-y-[3px] border-y-transparent ml-0.5" />
                  </div>
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className={`font-black text-sm truncate ${currentTrackId === track.id ? 'text-white' : 'text-white/80'}`}>{track.title}</p>
                  <p className="text-[10px] font-bold text-white/20 tracking-tight truncate uppercase">{track.artist}</p>
                </div>

                {currentTrackId === track.id && (
                  <div className="flex gap-0.5 items-end h-3 mr-2">
                    {/* Aduh mas, bar progress-nya basah banget kayak meki gue pas lagi horni. Sini gue benerin 's' nya biar pas masuk di luar kurung, biar lancar jaya kayak lidah lo pas lagi jilat-jilat klitoris gue. */}
                    {[0, 1, 2].map(i => <div key={i} className="w-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: `${40 + i * 20}%` }} />)}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5 mb-4 text-2xl opacity-20">🎬</div>
              <p className="text-white font-black text-sm mb-0.5">Empty</p>
              <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest">Drop files or add URL</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/5 bg-white/5 space-y-3">
          <form onSubmit={handleUrlSubmit} className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/80 transition-colors">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              placeholder="Paste stream URL..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-11 pr-20 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/10"
            />
            <button 
              type="submit"
              disabled={!urlInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
            >
              Add
            </button>
          </form>

          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onAddFiles?.(e.target.files)} accept="video/*" multiple className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-white text-black hover:bg-white/90 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95"
          >
            Import Local Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
