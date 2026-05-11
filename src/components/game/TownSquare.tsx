import { useState, useMemo, memo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, usePlayerSecretData } from '../../hooks/useFirebaseSync';
import { cn } from '../../lib/utils/cn';
import { getRoleName, TROUBLE_BREWING_ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { handleDemonDeath, checkWinCondition } from '../../lib/gameLogic';

// Memoized Player Token Component to prevent unnecessary re-renders
const PlayerToken = memo(({ 
  player, 
  index, 
  total, 
  secret, 
  showFullInfo, 
  selectedNominator, 
  onClick,
  isVoting,
  role,
  isNominated,
  hasVotedYes
}: any) => {
  const radius = 145;
  const pos = useMemo(() => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${180 + radius * Math.cos(angle)}px`,
      top: `${180 + radius * Math.sin(angle)}px`,
    };
  }, [index, total]);

  const isDead = player.isDead;
  const hasGhostVote = player.hasGhostVote;
  const isPoisoned = secret?.isPoisoned;
  const isDrunk = secret?.isDrunk;
  const isUsed = secret?.isUsed;

  const isSelectingNominator = selectedNominator === player.uid;
  const isBeingTargeted = selectedNominator && !isSelectingNominator;

  return (
    <div 
      style={pos} 
      onClick={() => onClick(player.uid)}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-300",
        role === 'st' && !isVoting && "cursor-pointer hover:scale-110 active:scale-95"
      )}
    >
      <div className={cn(
        "relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-700 shadow-2xl",
        isDead ? "border-slate-800 bg-slate-950 grayscale opacity-50" : "border-slate-700 bg-slate-900",
        showFullInfo && secret?.alignment === 'evil' && !isDead && "border-rose-600 shadow-[0_0_25px_rgba(225,29,72,0.5)] ring-2 ring-rose-500/20",
        showFullInfo && secret?.alignment === 'good' && !isDead && "border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)] ring-2 ring-sky-500/10",
        isSelectingNominator && "border-sky-400 ring-4 ring-sky-400/30 scale-110 shadow-[0_0_30px_rgba(56,189,248,0.6)] z-20",
        isBeingTargeted && "hover:border-rose-500 hover:ring-4 hover:ring-rose-500/30",
        isNominated && "border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
      )}>
        {showFullInfo ? (
           <div className={cn(
             "text-sm font-black tracking-tighter",
             secret?.alignment === 'evil' ? "text-rose-500" : "text-sky-400"
           )}>
             {secret?.character?.substring(0, 1).toUpperCase() || '?'}
           </div>
        ) : (
           <span className="text-slate-600 text-sm font-black font-mono">{index + 1}</span>
        )}

        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-[120%] h-[2.5px] bg-rose-700 rotate-45 shadow-sm"></div>
            <div className="w-[120%] h-[2.5px] bg-rose-700 -rotate-45 shadow-sm"></div>
          </div>
        )}

        {isDead && hasGhostVote && (
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500 rounded-full border-[3px] border-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-bounce z-30">
            <span className="text-sm text-slate-950 font-black italic">!</span>
          </div>
        )}

        {hasVotedYes && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg z-30">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col items-center gap-1 max-w-[100px]">
        <span className={cn(
          "text-sm font-black uppercase tracking-widest truncate w-full text-center px-2 py-0.5 rounded transition-all",
          isDead ? "text-slate-700" : "text-slate-200 bg-slate-900/40 border border-slate-800 shadow-sm",
          isSelectingNominator && "text-sky-400 bg-sky-950 border-sky-500/50",
          isNominated && "text-amber-400 bg-amber-950 border-amber-500/50",
          hasVotedYes && "text-emerald-400 bg-emerald-950 border-emerald-500/50"
        )}>
          {player.name}
        </span>

        {showFullInfo && (
           <div className="flex flex-col items-center">
             <span className={cn(
               "text-xs font-bold uppercase tracking-wider leading-none mb-1",
               secret?.alignment === 'evil' ? "text-rose-500/90" : "text-sky-400/90"
             )}>
               {getRoleName(secret?.character)}
               {secret?.character === 'drunk' && secret?.fakeCharacter && (
                 <span className="text-[10px] text-amber-500 ml-1">({getRoleName(secret.fakeCharacter)})</span>
               )}
             </span>
             
             <div className="flex gap-1 mt-1 flex-wrap justify-center">
                {isPoisoned && <span className="text-xs font-black bg-purple-600 text-white px-1.5 py-0.5 rounded shadow-sm uppercase">Psn</span>}
                {isDrunk && <span className="text-xs font-black bg-amber-600 text-slate-950 px-1.5 py-0.5 rounded shadow-sm uppercase">Drk</span>}
                {isUsed && <span className="text-xs font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shadow-sm uppercase">Used</span>}
             </div>
           </div>
        )}
      </div>
    </div>
  );
});

export function TownSquare() {
  const { user } = useAuth();
  
  // Selective state selection from Zustand to reduce re-renders
  const roomId = useGameStore(state => state.roomId);
  const roomState = useGameStore(state => state.roomState);
  const role = useGameStore(state => state.role);
  const showSpyIntel = useGameStore(state => state.showSpyIntel);

  const { playerSecret } = usePlayerSecretData(roomId, user?.uid || null);

  const isSpy = useMemo(() => 
    role === 'player' && user && playerSecret?.character === 'spy',
    [role, user, playerSecret?.character]
  );

  const isNight = roomState?.status === 'night';
  const showFullInfo = role === 'st' || !!(isSpy && (isNight || showSpyIntel));

  const { secretState } = useSecretData(roomId, showFullInfo);

  // ST Selection State
  const [selectedNominator, setSelectedNominator] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  if (!roomState) return null;

  // Memoize players list to prevent array recreation on every render
  const players = useMemo(() => 
    Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex),
    [roomState.players]
  );

  const isVoting = roomState.status === 'voting';
  const usedNominators = roomState.usedNominators || [];
  const usedTargets = roomState.usedTargets || [];

  const activeNominationKey = roomState.nominations ? Object.keys(roomState.nominations)[0] : null;
  const activeNomination = activeNominationKey && roomState.nominations ? roomState.nominations[activeNominationKey] : null;
  
  const lastHistory = roomState.nominationHistory?.[roomState.nominationHistory.length - 1];

  const currentTargetUid = isVoting && activeNomination ? activeNomination.targetUid : (lastHistory?.targetUid || null);
  const currentVoterUids = isVoting && activeNomination 
    ? Object.keys(activeNomination.voters || {}).filter(uid => activeNomination.voters[uid] === true)
    : (lastHistory?.voterUids || []);

  const handlePlayerClick = async (clickedUid: string) => {
    if (role !== 'st' || isVoting || roomState.status === 'end') return;

    const clickedPlayer = roomState.players[clickedUid];
    if (clickedPlayer.isDead && !selectedNominator) return; // Dead can't nominate

    if (!selectedNominator) {
      if (usedNominators.includes(clickedUid)) {
        alert("이 플레이어는 이미 오늘 지목을 했습니다.");
        return;
      }
      setSelectedNominator(clickedUid);
    } else {
      if (selectedNominator === clickedUid) {
        setSelectedNominator(null);
        return;
      }
      if (usedTargets.includes(clickedUid)) {
        alert("이 플레이어는 이미 오늘 지목을 당했습니다.");
        return;
      }
      if (clickedPlayer.isDead) {
         alert("사망자는 지목할 수 없습니다.");
         return;
      }

      const nominatorName = roomState.players[selectedNominator].name;
      const targetName = clickedPlayer.name;

      if (window.confirm(`${nominatorName}님이 ${targetName}님을 지목하시겠습니까?`)) {
        const targetSecret = secretState?.players[clickedUid];
        const nominatorSecret = secretState?.players[selectedNominator];
        
        let virginTriggeredExecution = false;
        
        if (targetSecret?.character === 'virgin' && !targetSecret.isUsed) {
           const updates: Record<string, any> = {};
           
           // 항상 능력이 사용된 것으로 처리 (첫 지목 시)
           updates[`secret/rooms/${roomId}/players/${clickedUid}/isUsed`] = true;
           
           if (!targetSecret.isPoisoned && !targetSecret.isDrunk) {
              let triggersVirgin = false;
              if (nominatorSecret?.alignment === 'good' && !['butler', 'drunk', 'recluse', 'saint'].includes(nominatorSecret.character || '')) {
                 triggersVirgin = true;
              } else if (nominatorSecret?.character === 'spy') {
                 if (window.confirm("스파이가 처녀를 지목했습니다. 스파이를 마을 주민으로 취급하여 즉시 처형하시겠습니까?")) {
                    triggersVirgin = true;
                 }
              }

              if (triggersVirgin) {
                 virginTriggeredExecution = true;
                 
                 const pubClone = JSON.parse(JSON.stringify(roomState));
                 const secClone = JSON.parse(JSON.stringify(secretState));
                 pubClone.players[selectedNominator].isDead = true;
                 pubClone.players[selectedNominator].hasGhostVote = true;
                 pubClone.lastExecutedUid = selectedNominator;
                 secClone.players[clickedUid].isUsed = true;

                 if (secClone.players[selectedNominator]?.character === 'imp') {
                    handleDemonDeath(pubClone, secClone, false, selectedNominator);
                 }

                 const winner = checkWinCondition(pubClone, secClone);
                 if (winner) {
                    pubClone.status = 'end';
                    pubClone.winner = winner;
                 } else {
                    pubClone.status = 'night';
                    pubClone.dayNumber += 1;
                    pubClone.usedNominators = [];
                    pubClone.usedTargets = [];
                    pubClone.nominationHistory = [];
                 }

                 updates[`public/rooms/${roomId}`] = pubClone;
                 updates[`secret/rooms/${roomId}/players`] = secClone.players;
                 alert(`처녀(Virgin) 능력이 발동되었습니다! 지목자 ${roomState.players[selectedNominator].name}님이 즉시 처형됩니다.`);
              }
           }
           
           if (virginTriggeredExecution) {
              await update(ref(database), updates);
              setSelectedNominator(null);
              return;
           } else {
              // 처형되지 않았어도 isUsed는 업데이트해야 하므로
              await update(ref(database), updates);
           }
        }

        const newNomination = { 
          targetUid: clickedUid, 
          nominatorUid: selectedNominator, 
          yesVotes: 0, 
          noVotes: 0, 
          voters: {} 
        };
        
        const updates: Record<string, any> = {};
        updates[`public/rooms/${roomId}/status`] = 'voting';
        updates[`public/rooms/${roomId}/nominations`] = { [clickedUid]: newNomination };
        updates[`public/rooms/${roomId}/usedNominators`] = [...usedNominators, selectedNominator];
        updates[`public/rooms/${roomId}/usedTargets`] = [...usedTargets, clickedUid];
        
        await update(ref(database), updates);
        setSelectedNominator(null);
      } else {
        setSelectedNominator(null);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-2 sm:py-6 relative">
      <div className="mb-8 flex items-center justify-between w-full max-w-sm px-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] font-serif">Town Square</h3>
        <div className="flex gap-3 items-center">
           <button 
             onClick={() => setIsHelpOpen(true)}
             className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
             aria-label="캐릭터 도움말"
           >
             ?
           </button>
           <span className="text-xs text-sky-500 font-mono bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20 uppercase font-black tracking-widest">
             DAY {roomState.dayNumber}
           </span>
        </div>
      </div>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md overflow-y-auto flex flex-col items-center p-4 sm:p-8 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative mb-10">
             <button 
               onClick={() => setIsHelpOpen(false)}
               className="absolute top-6 right-6 w-8 h-8 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center font-black hover:bg-rose-600 hover:text-white transition-colors"
             >
               X
             </button>
             <h2 className="text-2xl font-black text-slate-200 uppercase tracking-tighter mb-8 border-b border-slate-800 pb-4">캐릭터 가이드</h2>
             
             <div className="space-y-8">
               {['townsfolk', 'outsider', 'minion', 'demon'].map(type => {
                 const typeLabel = ({ townsfolk: '주민 (Townsfolk)', outsider: '외부자 (Outsider)', minion: '하수인 (Minion)', demon: '악마 (Demon)' } as Record<string, string>)[type];
                 const typeColor = ({ townsfolk: 'text-sky-400', outsider: 'text-sky-200', minion: 'text-rose-400', demon: 'text-rose-600' } as Record<string, string>)[type] || 'text-slate-400';
                 const borderColor = typeColor.includes('sky') ? 'border-sky-500' : (typeColor.includes('rose') ? 'border-rose-500' : 'border-slate-500');
                 const roles = TROUBLE_BREWING_ROLES.filter(r => r.type === type);
                 
                 return (
                   <div key={type} className="space-y-3">
                     <h3 className={cn("text-xs font-black uppercase tracking-widest border-l-2 pl-3", typeColor, borderColor)}>{typeLabel}</h3>
                     <div className="space-y-2">
                       {roles.map(r => (
                         <div key={r.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                           <span className={cn("text-sm font-bold block mb-1", typeColor)}>{r.name}</span>
                           <p className="text-xs text-slate-400 leading-relaxed break-keep-all">{r.description}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
      )}

      <div className="relative w-[360px] h-[360px] bg-slate-900/10 rounded-full border border-slate-800/30 flex items-center justify-center">
        {role === 'st' && !isVoting && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 animate-fade-in">
             <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-1">
               {selectedNominator ? "지목할 대상을 클릭하세요" : "지목자를 클릭하세요"}
             </p>
             <div className="flex justify-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", selectedNominator ? "bg-sky-500" : "bg-sky-500 animate-pulse")}></div>
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", selectedNominator ? "bg-rose-500 animate-pulse" : "bg-slate-800")}></div>
             </div>
          </div>
        )}

        <div className="w-24 h-28 bg-slate-950 rounded-[40%] blur-3xl opacity-50 absolute pointer-events-none"></div>
        
        {players.map((p, i) => (
          <PlayerToken
            key={p.uid}
            player={p}
            index={i}
            total={players.length}
            secret={secretState?.players[p.uid]}
            showFullInfo={showFullInfo}
            selectedNominator={selectedNominator}
            onClick={handlePlayerClick}
            isVoting={isVoting}
            role={role}
            isNominated={currentTargetUid === p.uid}
            hasVotedYes={currentVoterUids.includes(p.uid)}
          />
        ))}
      </div>
    </div>
  );
}

