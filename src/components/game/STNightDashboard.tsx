import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { resolveNightActions, getNightSuggestions } from '../../lib/rulesEngine';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils/cn';
import { handleDemonDeath, checkWinCondition } from '../../lib/gameLogic';

import { TownSquare } from './TownSquare';

export function STNightDashboard() {
  const roomId = useGameStore(state => state.roomId);
  const roomState = useGameStore(state => state.roomState);
  const { secretState } = useSecretData(roomId, true);
  
  const [editedSuggestions, setEditedSuggestions] = useState<Record<string, string>>({});
  const [suggestionWarnings, setSuggestionWarnings] = useState<Record<string, string>>({});
  const [pendingDeaths, setPendingDeaths] = useState<string[]>([]);
  const [pendingPoisoned, setPendingPoisoned] = useState<string | null>(null);
  const [mayorTargeted, setMayorTargeted] = useState<{ uid: string, isMisinformed: boolean } | null>(null);

  useEffect(() => {
    if (secretState?.nightResults) {
      const results: Record<string, string> = {};
      const warnings: Record<string, string> = {};
      Object.entries(secretState.nightResults).forEach(([uid, res]: [string, any]) => {
        results[uid] = res.message;
        if (res.warning) warnings[uid] = res.warning;
      });
      setEditedSuggestions(prev => ({ ...results, ...prev }));
      setSuggestionWarnings(prev => ({ ...warnings, ...prev }));
    }
    
    if (roomState && secretState) {
       const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
       const deaths = Object.keys(newPublicState.players).filter(uid => 
          newPublicState.players[uid].isDead && !roomState.players[uid].isDead
       );
       setPendingDeaths(deaths);
       
       const poisonedUid = Object.keys(newSecretState.players).find(uid => newSecretState.players[uid].isPoisoned);
       setPendingPoisoned(poisonedUid || null);

       let mTargeted = null;
       const impEntry = Object.entries(secretState.players).find(([_, p]) => p.character === 'imp' && !roomState.players[_]?.isDead);
       if (impEntry) {
          const impUid = impEntry[0];
          const impAction = secretState.nightActions?.[impUid];
          const impSecret = secretState.players[impUid];
          if (impAction?.targetUid) {
             const targetSecret = secretState.players[impAction.targetUid];
             if ((targetSecret?.fakeCharacter || targetSecret?.character) === 'mayor') {
                const isMisinformed = impSecret.isPoisoned || impSecret.isDrunk;
                mTargeted = { uid: impAction.targetUid, isMisinformed };
             }
          }
       }
       setMayorTargeted(mTargeted);
    }
  }, [roomState, secretState]);

  const handleUpdateSuggestion = useCallback((uid: string, msg: string) => {
    setEditedSuggestions(prev => ({ ...prev, [uid]: msg }));
  }, []);

  const generateAutoSuggestions = useCallback(() => {
     if (!roomState || !secretState) return;
     const simPubState = JSON.parse(JSON.stringify(roomState));
     pendingDeaths.forEach(uid => {
        if (simPubState.players[uid]) simPubState.players[uid].isDead = true;
     });
     const suggestions = getNightSuggestions(roomState, secretState, simPubState);
     const newEdits: Record<string, string> = { ...editedSuggestions };
     const newWarnings: Record<string, string> = { ...suggestionWarnings };
     Object.entries(suggestions).forEach(([uid, res]: [string, any]) => {
        newEdits[uid] = res.message;
        if (res.warning) newWarnings[uid] = res.warning;
     });
     setEditedSuggestions(newEdits);
     setSuggestionWarnings(newWarnings);
  }, [roomState, secretState, editedSuggestions, suggestionWarnings, pendingDeaths]);

  const toggleDeath = useCallback((uid: string) => {
    setPendingDeaths(prev => 
       prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  }, []);

  const finalizeNight = async () => {
    if (!roomState || !secretState || !roomId) return;
    const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
    
    // 모든 플레이어에 대해 이번 밤의 행동과 ST 메시지를 기록
    Object.keys(newPublicState.players).forEach(uid => {
       const action = secretState.nightActions?.[uid];
       const targetName1 = action?.targetUid ? roomState.players[action.targetUid]?.name : null;
       const targetName2 = action?.target2Uid ? roomState.players[action.target2Uid]?.name : null;
       
       let actionText = '';
       if (targetName1 && targetName2) {
          actionText = `행동: ${targetName1}, ${targetName2} 선택`;
       } else if (targetName1) {
          actionText = `행동: ${targetName1} 선택`;
       } else {
          actionText = `행동: 없음`;
       }

       const msg = editedSuggestions[uid]?.trim();
       let finalText = '';
       if (msg) {
          finalText = `${actionText}\n수신 정보: ${msg}`;
       } else {
          finalText = `${actionText}\n수신 정보: 없음`;
       }

       newSecretState.players[uid].messageHistory = [
          ...(newSecretState.players[uid].messageHistory || []),
          finalText
       ];
    });

    Object.keys(newPublicState.players).forEach(uid => {
       const wasDeadBefore = roomState.players[uid].isDead;
       if (!wasDeadBefore) {
          const shouldBeDead = pendingDeaths.includes(uid);
          newPublicState.players[uid].isDead = shouldBeDead;
          if (shouldBeDead) newPublicState.players[uid].hasGhostVote = true;
       }
    });

    const impEntry = Object.entries(newSecretState.players).find(([_, p]) => p.character === 'imp');
    if (impEntry && newPublicState.players[impEntry[0]]?.isDead) {
       const impUid = impEntry[0];
       const impAction = secretState.nightActions?.[impUid];
       const isStarpass = impAction?.targetUid === impUid;
       handleDemonDeath(newPublicState, newSecretState, isStarpass, impUid);
    }

    const winner = checkWinCondition(newPublicState, newSecretState);
    if (winner) {
       newPublicState.status = 'end';
       newPublicState.winner = winner;
    } else {
       newPublicState.status = 'day';
    }

    newSecretState.nightResults = {};
    newSecretState.nightActions = {};

    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}`] = newPublicState;
    updates[`secret/rooms/${roomId}`] = newSecretState;
    await update(ref(database), updates);
  };

  const players = useMemo(() => 
    Object.values(roomState?.players || {}).sort((a, b) => a.seatIndex - b.seatIndex),
    [roomState?.players]
  );

  if (!roomState || !secretState) return null;

  const actions = secretState.nightActions || {};

  return (
    <div className="w-full space-y-12 animate-fade-in pb-24 px-0 sm:px-0">
      <TownSquare />
      
      {/* 1. 행동 모니터링 Section */}
      <section className="bg-slate-900/90 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl pointer-events-none"></div>
         <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-8 border-b border-slate-800/50 pb-4">실시간 밤 행동 요약</h3>
         <div className="grid grid-cols-1 gap-4">
            {players.filter(p => !p.isDead).map(p => {
               const action = actions[p.uid];
               const role = secretState.players[p.uid]?.character;
               const isNight1 = roomState.dayNumber === 1;
               const needsTarget = ['poisoner'].includes(role || '') || (role === 'ravenkeeper' && !isNight1) || (role === 'imp' && !isNight1) || (role === 'monk' && !isNight1);
               const needsTwoTargets = ['fortune_teller'].includes(role || '');
               const isButler = role === 'butler';

               if (!needsTarget && !needsTwoTargets && !isButler) return null;
               
               return (
                 <div key={p.uid} className="flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 shadow-inner group">
                    <div className="flex flex-col">
                       <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{getRoleName(role)}</span>
                       <span className="text-sm font-black text-slate-200">{p.name}</span>
                    </div>
                    <div className="text-right">
                       {action?.status === 'completed' ? (
                          <div className="flex flex-col items-end">
                             <span className="text-xs text-sky-400 font-black bg-sky-500/10 px-3 py-1 rounded-lg border border-sky-500/20 shadow-sm animate-fade-in">
                                {roomState.players[action.targetUid || '']?.name || '완료'}
                                {action.target2Uid && `, ${roomState.players[action.target2Uid]?.name}`}
                             </span>
                          </div>
                       ) : (
                          <span className="text-xs text-slate-700 font-black animate-pulse italic uppercase tracking-wider">대기 중</span>
                       )}
                    </div>
                 </div>
               );
            })}
         </div>
      </section>

      {/* 2. 사망자 확정 Section */}
      <section className="bg-slate-900/90 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl pointer-events-none"></div>
         <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-8 border-b border-slate-800/50 pb-4">아침 사망자 명단 확정</h3>
         
         {mayorTargeted && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl animate-pulse">
               <h4 className="text-amber-400 font-black uppercase text-sm mb-2">⚠️ 시장 타겟 알림</h4>
               <p className="text-xs text-amber-200/80 leading-relaxed">
                  임프가 시장(<span className="font-bold text-amber-400">{roomState.players[mayorTargeted.uid]?.name}</span>)을 공격했습니다. 
                  <br/>
                  시장의 능력에 따라 <strong>다른 사람을 대신 죽이거나, 아무도 죽지 않도록(생존 처리) 명단을 직접 변경</strong>할 수 있습니다.
                  {mayorTargeted.isMisinformed && <span className="block mt-1 text-rose-400">※ 주의: 현재 임프는 주정뱅이거나 중독 상태이므로, 시장의 능력이 올바르게 작동하지 않거나 킬 자체가 무효화될 수 있습니다.</span>}
               </p>
            </div>
         )}

         <div className="flex flex-wrap gap-3 mb-6">
            {players.map(p => (
               <button
                 key={p.uid}
                 onClick={() => toggleDeath(p.uid)}
                 className={cn(
                   "px-4 py-3 rounded-2xl text-sm font-black border transition-all duration-300 active:scale-95",
                   p.isDead ? "hidden" : (
                      pendingDeaths.includes(p.uid)
                      ? "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-900/40 z-10"
                      : "bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700"
                   )
                 )}
               >
                  {p.name} {pendingDeaths.includes(p.uid) ? '사망' : '생존'}
               </button>
            ))}
         </div>
         <div className="flex items-start gap-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800/30">
            <span className="text-amber-500 text-xs">ℹ️</span>
            <p className="text-xs text-slate-500 leading-relaxed italic">
               시스템이 악마의 공격을 계산하여 제안했습니다. 시장의 능력 발동이나 군인의 생존 등 변수가 있다면 위 명단을 직접 수정하세요. 붉은색으로 표시된 인원들이 다음 아침에 사망한 것으로 발표됩니다.
            </p>
         </div>
      </section>

      {/* 3. 플레이어 정보 전송 Section */}
      <section className="bg-slate-900/90 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl pointer-events-none"></div>
         <div className="flex justify-between items-center mb-8 border-b border-slate-800/50 pb-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">개별 정보 메시지 작성</h3>
            <button 
               onClick={generateAutoSuggestions}
               className="text-xs font-black bg-sky-500 text-slate-950 px-4 py-1.5 rounded-full hover:bg-sky-400 transition-all active:scale-95 shadow-lg shadow-sky-950/40 uppercase tracking-tighter"
            >
               자동 제안 생성
            </button>
         </div>
         
         <div className="space-y-8 pr-3">
            {players.map(p => {
               const secret = secretState.players[p.uid];
               return (
                 <div key={p.uid} className="space-y-3 group bg-slate-950/30 p-4 rounded-2xl border border-transparent hover:border-slate-800 transition-colors">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full shadow-sm", p.isDead ? "bg-slate-700" : "bg-emerald-500 shadow-emerald-500/20")}></div>
                          <span className="text-sm font-black text-slate-200">
                             {p.name} 
                             <span className="text-xs text-slate-500 font-bold ml-2 tracking-widest">
                               ({getRoleName(secret?.character)})
                               {secret?.character === 'drunk' && secret?.fakeCharacter && ` -> (${getRoleName(secret.fakeCharacter)})`}
                             </span>
                          </span>
                       </div>
                       <div className="flex gap-1.5">
                          {secret?.character === 'dead_imp' && <span className="text-xs bg-rose-950 text-rose-500 border border-rose-900/50 px-2 py-0.5 rounded-full font-black uppercase shadow-sm">구 임프</span>}
                          {secret?.character === 'imp' && <span className="text-xs bg-rose-600 text-white border border-rose-500 px-2 py-0.5 rounded-full font-black uppercase shadow-sm animate-pulse">현 임프</span>}
                          {secret?.isUsed && <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-black uppercase shadow-sm">사용됨</span>}
                          {pendingPoisoned === p.uid && <span className="text-xs bg-purple-600/20 text-purple-400 border border-purple-600/30 px-2 py-0.5 rounded-full font-black uppercase shadow-sm animate-pulse">독</span>}
                          {secret?.isDrunk && <span className="text-xs bg-amber-600/20 text-amber-500 border border-amber-600/30 px-2 py-0.5 rounded-full font-black uppercase shadow-sm">취함</span>}
                          {p.isDead && p.hasGhostVote && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black uppercase animate-pulse">유령 표</span>}
                       </div>
                    </div>
                    {suggestionWarnings[p.uid] && (
                       <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl mb-2 animate-pulse">
                          <p className="text-[10px] text-amber-400 font-bold leading-relaxed">⚠️ {suggestionWarnings[p.uid]}</p>
                       </div>
                    )}
                    <textarea
                      placeholder={`${p.name}님에게 전달할 비밀 정보를 입력하세요...`}
                      value={editedSuggestions[p.uid] || ''}
                      onChange={(e) => handleUpdateSuggestion(p.uid, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 focus:border-sky-500/50 focus:bg-slate-900 outline-none min-h-[80px] custom-scrollbar transition-all shadow-inner"
                    />
                 </div>
               );
            })}
         </div>
      </section>

      <Button onClick={finalizeNight} variant="primary" size="lg" className="w-full h-24 font-black uppercase tracking-[0.4em] text-2xl shadow-2xl border-transparent shadow-sky-950/50 hover:scale-[1.01] active:scale-[0.99] transition-all">
         아침을 깨우기
      </Button>
    </div>
  );
}
