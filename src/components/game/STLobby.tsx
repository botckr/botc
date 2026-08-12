import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameData, useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, set } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

import { GrimoireSetup } from './GrimoireSetup';
import { HistoryViewer } from './HistoryViewer';

export function STLobby() {
  const { user } = useAuth();
  const { roomId, setRoomId } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { roomState } = useGameStore();
  const { updatePublicState } = useGameData(roomId);
  useSecretData(roomId, true); // true because ST

  if (showHistory) {
     return <HistoryViewer onClose={() => setShowHistory(false)} />;
  }

  if (roomState?.status === 'setup') {
    return <GrimoireSetup />;
  }

  const handleCreateRoom = async () => {
    if (!user) return;
    setLoading(true);
    // Generate a simple 6-digit room code
    const newRoomId = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      // Setup public state
      await set(ref(database, `public/rooms/${newRoomId}`), {
        stUid: user.uid,
        status: 'lobby',
        dayNumber: 0,
        players: {},
      });

      // Setup secret state
      await set(ref(database, `secret/rooms/${newRoomId}`), {
        stUid: user.uid,
        players: {},
        nightActions: {},
        nightResults: {},
      });

      setRoomId(newRoomId);
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    // Transition to setup phase
    await updatePublicState({ status: 'setup' });
  };

  if (!roomId) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in w-full">
        <h2 className="text-xl font-bold text-slate-300">스토리텔러 모드</h2>
        <Button
          onClick={handleCreateRoom}
          disabled={loading || !user}
          isLoading={loading}
          variant="primary"
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          새로운 방 생성하기
        </Button>
        <Button
          onClick={() => setShowHistory(true)}
          variant="secondary"
          size="lg"
          className="w-full text-slate-400"
        >
          과거 기록 열람
        </Button>
      </div>
    );
  }

  // Room created, showing lobby
  const players = roomState?.players || {};
  const playerCount = Object.keys(players).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-md animate-fade-in">
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <p className="text-sm text-slate-400 mb-2 relative z-10">참여 코드</p>
        <h1 className="text-4xl sm:text-4xl font-mono tracking-widest text-sky-400 font-bold relative z-10 drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]">{roomId}</h1>
      </div>

      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/80 backdrop-blur">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
          <h3 className="text-slate-300 font-medium">참가자 목록</h3>
          <span className="bg-slate-950 text-sky-400 border border-sky-500/20 text-xs px-3 py-1 rounded-full font-medium">
            {playerCount}명 대기 중
          </span>
        </div>
        
        <ul className="space-y-2 pr-1">
          {Object.entries(players).map(([uid, player]) => (
            <li key={uid} className="bg-slate-950 p-3 rounded-lg text-slate-300 flex items-center justify-between animate-fade-in border border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{player.name}</span>
              </div>
            </li>
          ))}
          {playerCount === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm animate-pulse">플레이어를 기다리는 중입니다...</p>
            </div>
          )}
        </ul>
      </div>

      <Button
        onClick={handleStartGame}
        disabled={playerCount < 5}
        variant="primary"
        size="lg"
        className="w-full"
      >
        마도서 세팅 시작 (최소 5명 권장)
      </Button>
    </div>
  );
}
