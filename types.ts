
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string; // Digunakan juga sebagai Video URL
  duration: number;
  type: 'audio' | 'video';
}

export enum PlayerState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LOADING = 'LOADING'
}

export interface MoodAnalysis {
  mood: string;
  color: string;
  description: string;
}
