import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  hasVotedYes,
  radius,
  center
}: any) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const left = center + radius * Math.cos(angle);
  const top = center + radius * Math.sin(angle);

  const isDead = player.isDead;
  const hasGhostVote = player.hasGhostVote;
  const isPoisoned = secret?.isPoisoned;
  const isDrunk = secret?.isDrunk;
  const isUsed = secret?.isUsed;

  const isSelectingNominator = selectedNominator === player.uid;
  const isBeingTargeted = selectedNominator && !isSelectingNominator;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0, left: `${center}px`, top: `${center}px` }}
      animate={{ opacity: 1, scale: 1, left: `${left}px`, top: `${top}px` }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.03 }}
      whileHover={{ scale: 1.1, zIndex: 50 }}
      whileTap={{ scale: 0.95 }}
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
                {secret?.isRedHerring && <span className="text-[10px] font-black bg-rose-950/80 text-rose-300 border border-rose-900/50 px-1.5 py-0.5 rounded shadow-sm uppercase">환각</span>}
                {isPoisoned && <span className="text-xs font-black bg-purple-600 text-white px-1.5 py-0.5 rounded shadow-sm uppercase">Psn</span>}
                {isDrunk && <span className="text-xs font-black bg-amber-600 text-slate-950 px-1.5 py-0.5 rounded shadow-sm uppercase">Drk</span>}
                {isUsed && <span className="text-xs font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shadow-sm uppercase">Used</span>}
             </div>
           </div>
        )}
      </div>
    </motion.button>
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
  const [activeTab, setActiveTab] = useState<'townsfolk' | 'outsider' | 'evil'>('townsfolk');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!roomState) return null;

  // Memoize players list to prevent array recreation on every render
  const players = useMemo(() => 
    Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex),
    [roomState.players]
  );

  const baseRadius = players.length > 10 ? 180 : 145;
  const baseCenter = players.length > 10 ? 220 : 180;
  const radius = baseRadius * zoomLevel;
  const center = baseCenter * zoomLevel;

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
    if (role !== 'st' || roomState?.status === 'end' || isVoting) return;

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
           let updates: Record<string, any> = {};
           
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
                 secClone.players[clickedUid].isUsed = true; // Set isUsed in clone

                 if (secClone.players[selectedNominator]?.character === 'imp') {
                    const inherited = handleDemonDeath(pubClone, secClone, false, selectedNominator);
                    if (inherited) {
                       secClone.dayLogs = secClone.dayLogs || {};
                       secClone.dayLogs[roomState.dayNumber] = secClone.dayLogs[roomState.dayNumber] || { nominations: [], executedUid: null, abilityLogs: [] };
                       secClone.dayLogs[roomState.dayNumber].abilityLogs = secClone.dayLogs[roomState.dayNumber].abilityLogs || [];
                       secClone.dayLogs[roomState.dayNumber].abilityLogs.push(`※ [시스템] 조건 충족으로 새로운 악마(임프)가 계승되었습니다.`);
                    }
                 }

                 const winResult = checkWinCondition(pubClone, secClone);
                 
                 secClone.dayLogs = secClone.dayLogs || {};
                 secClone.dayLogs[roomState.dayNumber] = {
                    ...secClone.dayLogs[roomState.dayNumber],
                    nominations: pubClone.nominationHistory || [],
                    executedUid: pubClone.lastExecutedUid || null,
                    abilityLogs: [...(secClone.dayLogs[roomState.dayNumber]?.abilityLogs || []), `처녀(Virgin) 능력 발동: 지목자 ${nominatorName} 즉시 처형`]
                 };

                 if (winResult) {
                    pubClone.status = 'end';
                    pubClone.winner = winResult.winner;
                    
                    const winningPlayers = Object.values(pubClone.players).map((p: any) => {
                       const secret = secClone.players[p.uid];
                       return {
                          name: p.name,
                          character: secret?.character || null,
                          originalCharacter: secret?.originalCharacter || null,
                          fakeCharacter: secret?.fakeCharacter || null,
                          isRedHerring: secret?.isRedHerring || false,
                          alignment: secret?.alignment || null
                       };
                    }).filter(p => p.alignment === pubClone.winner);
                    
                    pubClone.winningPlayers = winningPlayers;

                    const newId = `${Date.now()}_${roomId}`;
                    const historyRecord = {
                       id: newId,
                       timestamp: Date.now(),
                       winner: pubClone.winner,
                       winReason: winResult.reason,
                       evilInfo: secClone.evilInfo || null,
                       players: Object.values(pubClone.players).map((p: any) => ({
                          uid: p.uid,
                          name: p.name,
                          character: secClone.players[p.uid]?.character || null,
                          originalCharacter: secClone.players[p.uid]?.originalCharacter || null,
                          fakeCharacter: secClone.players[p.uid]?.fakeCharacter || null,
                          isRedHerring: secClone.players[p.uid]?.isRedHerring || false,
                          messageHistory: secClone.players[p.uid]?.messageHistory || []
                       })),
                       dayLogs: secClone.dayLogs
                    };
                    updates[`history/${newId}`] = historyRecord;
                 } else {
                    pubClone.status = 'night';
                    pubClone.dayNumber += 1;
                    
                    updates[`public/rooms/${roomId}/usedNominators`] = [];
                    updates[`public/rooms/${roomId}/usedTargets`] = [];
                    updates[`public/rooms/${roomId}/nominationHistory`] = [];
                 }

                 updates[`public/rooms/${roomId}/status`] = pubClone.status;
                 if (pubClone.status === 'night') {
                    updates[`public/rooms/${roomId}/dayNumber`] = pubClone.dayNumber;
                 } else if (pubClone.status === 'end') {
                    updates[`public/rooms/${roomId}/winner`] = pubClone.winner;
                    updates[`public/rooms/${roomId}/winReason`] = pubClone.winReason;
                    updates[`public/rooms/${roomId}/winningPlayers`] = pubClone.winningPlayers;
                 }
                 
                 updates[`public/rooms/${roomId}/players/${selectedNominator}/isDead`] = true;
                 updates[`public/rooms/${roomId}/players/${selectedNominator}/hasGhostVote`] = true;
                 updates[`public/rooms/${roomId}/lastExecutedUid`] = selectedNominator;

                 updates[`secret/rooms/${roomId}`] = secClone;
                 alert(`처녀(Virgin) 능력이 발동되었습니다! 지목자 ${roomState.players[selectedNominator].name}님이 즉시 처형됩니다.`);
              }
           }
           
           if (virginTriggeredExecution) {
              await update(ref(database), updates);
              setSelectedNominator(null);
              return;
           } else {
              // 처형되지 않았어도 isUsed는 업데이트해야 하므로
              updates = {};
              updates[`secret/rooms/${roomId}/players/${clickedUid}/isUsed`] = true;
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
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between w-full px-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] font-serif shrink-0">Town Square</h3>
        <div className="flex gap-2 sm:gap-3 items-center ml-auto">
           <div className="flex bg-slate-900 rounded-full border border-slate-700 p-0.5 shadow-inner">
             <button onClick={() => setZoomLevel(p => Math.max(0.6, p - 0.2))} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="축소">-</button>
             <button onClick={() => setZoomLevel(1)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold font-mono">1X</button>
             <button onClick={() => setZoomLevel(p => Math.min(2.0, p + 0.2))} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="확대">+</button>
           </div>
           <button 
             onClick={() => setIsHelpOpen(true)}
             className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black shadow-sm hover:bg-slate-700 hover:text-white transition-colors shrink-0"
             aria-label="캐릭터 도움말"
           >
             ?
           </button>
           <span className="text-xs text-sky-500 font-mono bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20 uppercase font-black tracking-widest shrink-0">
             DAY {roomState.dayNumber}
           </span>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md overflow-hidden flex flex-col items-center"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full h-full sm:max-w-xl sm:h-auto sm:max-h-[85vh] sm:mt-10 sm:rounded-3xl bg-slate-900 flex flex-col shadow-2xl relative"
            >
               <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur border-b border-slate-700/50 p-4 sm:p-6 flex flex-col gap-4 sm:rounded-t-3xl">
                  <div className="flex justify-between items-center">
                     <h2 className="text-xl sm:text-2xl font-black text-slate-200 uppercase tracking-tighter">캐릭터 가이드</h2>
                     <button 
                       onClick={() => setIsHelpOpen(false)}
                       className="w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center font-black hover:bg-rose-600 hover:text-white transition-colors"
                     >
                       X
                     </button>
                  </div>
                  <div className="flex gap-2 w-full">
                     {(['townsfolk', 'outsider', 'evil'] as const).map(tab => (
                        <button
                           key={tab}
                           onClick={() => setActiveTab(tab)}
                           className={cn(
                              "flex-1 py-2 text-xs sm:text-sm font-black uppercase tracking-widest rounded-lg transition-all",
                              activeTab === tab ? "bg-sky-600 text-white shadow-lg scale-105" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                           )}
                        >
                           {tab === 'townsfolk' ? '주민' : tab === 'outsider' ? '외부자' : '하수인/악마'}
                        </button>
                     ))}
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {(() => {
                        const renderType = (type: 'townsfolk' | 'outsider' | 'minion' | 'demon', label: string, colorClass: string) => {
                           const roles = TROUBLE_BREWING_ROLES.filter(r => r.type === type);
                           return (
                              <div key={type} className="space-y-3 mb-6">
                                <h3 className={cn("text-sm font-black uppercase tracking-widest border-l-4 pl-3", colorClass, colorClass.includes('sky') ? 'border-sky-500' : 'border-rose-500')}>{label}</h3>
                                <div className="space-y-2">
                                  {roles.map(r => (
                                    <div key={r.id} className="bg-slate-950/50 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                                      <span className={cn("text-base font-bold block mb-1.5", colorClass)}>{r.name}</span>
                                      <p className="text-sm text-slate-400 leading-relaxed break-keep-all">{r.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                           );
                        };

                        if (activeTab === 'townsfolk') return renderType('townsfolk', '마을 주민 (Townsfolk)', 'text-sky-400');
                        if (activeTab === 'outsider') return renderType('outsider', '외부자 (Outsider)', 'text-sky-200');
                        if (activeTab === 'evil') return (
                           <>
                              {renderType('minion', '하수인 (Minion)', 'text-rose-400')}
                              {renderType('demon', '악마 (Demon)', 'text-rose-600')}
                           </>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full overflow-auto pb-6 custom-scrollbar px-2 -mx-2 flex justify-center items-center" style={{ minHeight: `${center * 2}px` }}>
         <div 
            style={{ width: `${center * 2}px`, height: `${center * 2}px` }}
            className="relative bg-slate-900/10 rounded-full border border-slate-800/30 flex items-center justify-center flex-shrink-0 transition-all duration-300"
         >
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

           <div className="w-24 h-28 bg-slate-950 rounded-[40%] blur-3xl opacity-50 absolute pointer-events-none transition-all duration-300" style={{ transform: `scale(${zoomLevel})` }}></div>
           
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
               radius={radius}
               center={center}
             />
           ))}
         </div>
      </div>
    </div>
  );
}

