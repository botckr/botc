import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { STNightDashboard } from './STNightDashboard';
import { useState } from 'react';
import { cn } from '../../lib/utils/cn';
import { TownSquare } from './TownSquare';
import { PlayerIdentity } from './shared/PlayerIdentity';
import { PlayerRecords } from './shared/PlayerRecords';

export function NightPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret } = usePlayerSecretData(roomId, user?.uid || null);
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [target2Uid, setTarget2Uid] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!roomState || !user || !roomId) return null;

  const myRole = playerSecret?.fakeCharacter || playerSecret?.character;

  const handleConfirmAction = async () => {
    const updates: Record<string, any> = {};
    updates[`secret/rooms/${roomId}/nightActions/${user.uid}`] = {
      targetUid,
      target2Uid,
      status: 'completed'
    };
    await update(ref(database), updates);
    setIsConfirmed(true);
  };

  if (isST) return <STNightDashboard />;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const myPlayer = roomState.players[user.uid];
  const isNight1 = roomState.dayNumber === 1;
  const isDead = myPlayer?.isDead;

  const needsTarget = !isDead && (['poisoner', 'ravenkeeper'].includes(myRole || '') || (myRole === 'imp' && !isNight1) || (myRole === 'monk' && !isNight1));
  const needsTwoTargets = !isDead && ['fortune_teller'].includes(myRole || '');
  const isButler = !isDead && myRole === 'butler';

  const evilNames = playerSecret?.evilTeamInfo ? [playerSecret.evilTeamInfo.demonName, ...playerSecret.evilTeamInfo.minionNames] : [];

  const selectablePlayers = players.filter(p => {
    if (myRole === 'imp') {
      return !p.isDead;
    }
    if (p.uid === user.uid) return false;
    if (myRole === 'poisoner' && evilNames.includes(p.name)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg animate-fade-in pb-20 px-0 sm:px-0">

      {/* 1. 비밀 정보관 (Player Identity) */}
      {!isST && (
        <PlayerIdentity
          character={playerSecret?.character || null}
          fakeCharacter={playerSecret?.fakeCharacter}
          alignment={playerSecret?.alignment || null}
          evilTeamInfo={playerSecret?.evilTeamInfo}
          defaultOpen={isNight1}
          playerName={myPlayer?.name}
        />
      )}
      {/* 2. 마을 광장 (Town Square) */}
      <TownSquare />

      {/* 3. 밤 단계 Action Selection UI */}
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-[3rem] border border-slate-800 backdrop-blur shadow-2xl text-center space-y-6 sm:space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent"></div>
        
        <div className="space-y-2">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Current Phase</p>
           <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter italic font-serif">The Night Deepens</h2>
        </div>

        {isConfirmed ? (
           <div className="py-10 sm:py-12 px-6 bg-slate-950/50 rounded-[2.5rem] border border-slate-800 shadow-inner space-y-4">
              <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <div className="w-8 h-8 bg-sky-500 rounded-full animate-ping opacity-40"></div>
                 <div className="w-4 h-4 bg-sky-500 rounded-full absolute"></div>
              </div>
              <p className="text-sky-400 font-black uppercase tracking-widest text-sm">Action Transmitted</p>
              <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed break-keep-all">스토리텔러가 밤의 결산을 마치고 아침을 깨울 때까지 기다려 주세요.</p>
           </div>
        ) : (
           <div className="space-y-6 sm:space-y-8 animate-fade-in">
              {needsTarget || needsTwoTargets || isButler ? (
                 <div className="space-y-4 sm:space-y-6">
                    <p className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">{isButler ? '주인을 선택하세요' : '능력을 사용할 대상을 선택하세요'}</p>
                    <div className="grid grid-cols-2 gap-2 pr-2">
                       {selectablePlayers.map(p => (
                          <button
                            key={p.uid}
                            onClick={() => {
                               if (needsTwoTargets) {
                                  if (targetUid === p.uid) setTargetUid(null);
                                  else if (!targetUid) setTargetUid(p.uid);
                                  else if (target2Uid === p.uid) setTarget2Uid(null);
                                  else if (!target2Uid) setTarget2Uid(p.uid);
                               } else {
                                  setTargetUid(targetUid === p.uid ? null : p.uid);
                               }
                            }}
                            className={cn(
                               "p-3 sm:p-4 rounded-2xl border text-[11px] sm:text-xs font-black uppercase transition-all truncate outline-none",
                               (targetUid === p.uid || target2Uid === p.uid)
                                ? "bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-900/40"
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 focus-visible:ring-2 focus-visible:ring-sky-500"
                            )}
                          >
                             {p.name}
                          </button>
                       ))}
                    </div>
                 </div>
              ) : (
                 <div className="py-8 sm:py-10 px-4 bg-slate-950/40 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-800 shadow-inner">
                    <p className="text-slate-400 text-[11px] sm:text-xs font-bold leading-relaxed uppercase tracking-widest italic break-keep-all">당신은 밤에 깨지 않는 역할이거나,<br/>오늘 밤 특별한 행동이 필요하지 않습니다.</p>
                 </div>
              )}
              
              <Button 
                 onClick={handleConfirmAction} 
                 variant="primary" 
                 size="lg" 
                 className="w-full h-14 sm:h-16 text-base sm:text-lg font-black uppercase tracking-widest shadow-xl border-transparent"
                 disabled={(needsTarget && !targetUid) || (needsTwoTargets && (!targetUid || !target2Uid)) || (isButler && !targetUid)}
              >
                 밤 행동 확정 (Confirm)
              </Button>
           </div>
        )}
      </div>

      {/* 4. 기록 (Player Records) */}
      {!isST && (
        <PlayerRecords 
          messageHistory={playerSecret?.messageHistory}
          defaultOpen={!isNight1 && (playerSecret?.messageHistory?.length || 0) > 0}
        />
      )}
    </div>
  );
}
