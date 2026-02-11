
import { Track } from './types';

export const MOCK_PLAYLIST: Track[] = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    artist: 'Blender Foundation',
    album: 'Open Movie Project',
    coverUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop',
    audioUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 596,
    type: 'video'
  },
  {
    id: '2',
    title: 'Elephant Dream',
    artist: 'Orange Open Movie',
    album: 'CGI Classics',
    coverUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=600&auto=format&fit=crop',
    audioUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 653,
    type: 'video'
  },
  {
    id: '3',
    title: 'For Bigger Blazes',
    artist: 'Google',
    album: 'Sample Gallery',
    coverUrl: 'https://images.unsplash.com/photo-1492691523569-fa8146aa355d?q=80&w=600&auto=format&fit=crop',
    audioUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    type: 'video'
  }
];
