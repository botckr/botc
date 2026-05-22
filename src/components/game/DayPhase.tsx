import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData, useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { handleDemonDeath, checkWinCondition } from '../../lib/gameLogic';
import { TownSquare } from './TownSquare';
import { PlayerIdentity } from './shared/PlayerIdentity';
import { PlayerRecords } from './shared/PlayerRecords';

export function DayPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret } = usePlayerSecretData(roomId, user?.uid || null);
  const { secretState } = useSecretData(roomId, isST);

  const events = roomState?.events || {};
  const lastEventId = Object.keys(events).sort().pop();
  const lastEvent = lastEventId ? events[lastEventId] : null;

  const handleResolveSlayer = async (eventId: string, event: any) => {
    if (!isST || !secretState || !roomState) return;
    const actorUid = event.actorUid;
    const targetUid = event.targetUid;
    const updates: Record<string, any> = {};
    
    if (actorUid && targetUid && secretState?.players) {
       const actorSecret = secretState.players[actorUid];
       const targetSecret = secretState.players[targetUid];
       const pubClone = JSON.parse(JSON.stringify(roomState));
       const secClone = JSON.parse(JSON.stringify(secretState));

       if (secClone.players[actorUid]) {
          secClone.players[actorUid].isUsed = true;
       }

       const isMisinformed = actorSecret?.isDrunk || actorSecret?.isPoisoned;
       let isTargetImp = targetSecret?.character === 'imp';
       
       if (targetSecret?.character === 'recluse' && !isMisinformed) {
          if (window.confirm("슬레이어가 은둔자(Recluse)를 맞췄습니다! 은둔자를 악마로 취급하여 명중(DEAD) 처리하시겠습니까?")) {
             isTargetImp = true;
          }
       }

       let success = false;
       if (!isMisinformed && isTargetImp) {
          success = true;
          pubClone.players[targetUid].isDead = true;
          pubClone.players[targetUid].hasGhostVote = true;
       }

       secClone.dayLogs = secClone.dayLogs || {};
       if (!secClone.dayLogs[roomState.dayNumber]) {
          secClone.dayLogs[roomState.dayNumber] = { nominations: pubClone.nominationHistory || [], executedUid: null, abilityLogs: [] };
       }
       secClone.dayLogs[roomState.dayNumber].abilityLogs = secClone.dayLogs[roomState.dayNumber].abilityLogs || [];
       secClone.dayLogs[roomState.dayNumber].abilityLogs.push(`${actorSecret?.fakeCharacter === 'slayer' ? '주정뱅이(착각: 슬레이어)' : '슬레이어'} 능력 발동: ${roomState.players[targetUid]?.name} -> ${success ? '명중(DEAD)' : '빗나감(MISS)'}`);

       if (success) {
          const inherited = handleDemonDeath(pubClone, secClone, false, targetUid);
          if (inherited) {
             secClone.dayLogs[roomState.dayNumber].abilityLogs.push(`※ [시스템] 조건 충족으로 새로운 악마(임프)가 계승되었습니다.`);
          }
          
          const winResult = checkWinCondition(pubClone, secClone);
          if (winResult) {
             pubClone.status = 'end';
             pubClone.winner = winResult.winner;
             pubClone.winReason = winResult.reason;
             
             pubClone.winningPlayers = Object.values(pubClone.players).map((p: any) => {
                const secret = secClone.players[p.uid];
                return {
                   name: p.name,
                   character: secret?.character || null,
                   originalCharacter: secret?.originalCharacter || null,
                   fakeCharacter: secret?.fakeCharacter || null,
                   isRedHerring: secret?.isRedHerring || false,
                   alignment: secret?.alignment || null
                };
             }).filter((p: any) => p.alignment === pubClone.winner);
             
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
          }
       }
       
       if (pubClone.events && pubClone.events[eventId]) {
          pubClone.events[eventId].status = success ? 'dead' : 'miss';
       }
       
       updates[`public/rooms/${roomId}/events/${eventId}/status`] = success ? 'dead' : 'miss';
       if (success) {
          updates[`public/rooms/${roomId}/players/${targetUid}/isDead`] = true;
          updates[`public/rooms/${roomId}/players/${targetUid}/hasGhostVote`] = true;
          if (pubClone.status === 'end') {
             updates[`public/rooms/${roomId}/status`] = 'end';
             updates[`public/rooms/${roomId}/winner`] = pubClone.winner;
             updates[`public/rooms/${roomId}/winReason`] = pubClone.winReason;
             updates[`public/rooms/${roomId}/winningPlayers`] = pubClone.winningPlayers;
          }
       }
       updates[`secret/rooms/${roomId}/players`] = secClone.players;
       updates[`secret/rooms/${roomId}/dayLogs`] = secClone.dayLogs;
    }
    await update(ref(database), updates);
  };

  if (!roomState || !user || !roomId) return null;

  const myRole = playerSecret?.fakeCharacter || playerSecret?.character;
  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const isVoting = roomState.status === 'voting';
  const currentNominationKey = roomState.nominations ? Object.keys(roomState.nominations)[0] : null;
  const currentNomination = currentNominationKey && roomState.nominations ? roomState.nominations[currentNominationKey] : null;

  const alivePlayers = players.filter(p => !p.isDead);
  const majorityNeeded = Math.ceil(alivePlayers.length / 2);

  const voters = currentNomination?.voters || {};
  const yesCount = Object.values(voters).filter(v => v === true).length;

  const usedNominators = roomState.usedNominators || [];
  const usedTargets = roomState.usedTargets || [];

  const butlerEntry = isST && secretState?.players ? Object.entries(secretState.players).find(([_, p]) => (p.fakeCharacter || p.character) === 'butler') : null;
  const butlerUid = butlerEntry?.[0];
  const butlerSecret = butlerEntry?.[1];
  const butlerPlayer = butlerUid ? roomState.players[butlerUid] : null;
  const butlerVoted = butlerUid ? voters[butlerUid] === true : false;
  const masterUid = butlerSecret?.butlerMasterUid;
  const masterVoted = masterUid ? voters[masterUid] === true : false;
  const isButlerVotingIllegally = butlerVoted && !masterVoted && butlerPlayer && !butlerPlayer.isDead;

  const handleCancelNomination = async () => {
    if (!isST || !currentNomination) return;
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/status`] = 'day';
    updates[`public/rooms/${roomId}/nominations`] = null;
    updates[`public/rooms/${roomId}/usedNominators`] = usedNominators.filter(u => u !== currentNomination.nominatorUid);
    updates[`public/rooms/${roomId}/usedTargets`] = usedTargets.filter(u => u !== currentNomination.targetUid);
    await update(ref(database), updates);
  };

  const handleVote = async (vote: boolean) => {
    if (isST || !currentNominationKey || !currentNomination) return;
    
    const myPlayer = roomState.players[user.uid];
    const myRole = playerSecret?.fakeCharacter || playerSecret?.character;

    // Butler vote restriction (Only applies when Butler is alive and trying to vote YES)
    if (myRole === 'butler' && !myPlayer?.isDead && vote === true) {
       if (!playerSecret?.butlerMasterUid || voters[playerSecret.butlerMasterUid] !== true) {
          return;
       }
    }

    if (myPlayer.isDead && vote === true && !myPlayer.hasGhostVote) return;
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/nominations/${currentNominationKey}/voters/${user.uid}`] = vote;
    if (myPlayer.isDead) {
       if (vote === true) {
          updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = false;
       } else if (vote === false && voters[user.uid] === true) {
          updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = true;
       }
    }
    await update(ref(database), updates);
  };

  const endVoting = async () => {
    if (!isST || !currentNominationKey || !currentNomination) return;
    const currentHighest = roomState.highestVotes || 0;
    const updates: Record<string, any> = {};

    const voterNames = Object.entries(currentNomination.voters || {})
      .filter(([_, voted]) => voted === true)
      .map(([uid]) => roomState.players[uid]?.name || "Unknown");

    const voterUids = Object.entries(currentNomination.voters || {})
      .filter(([_, voted]) => voted === true)
      .map(([uid]) => uid);

    const record = {
      targetUid: currentNomination.targetUid,
      targetName: roomState.players[currentNomination.targetUid]?.name || "Unknown",
      nominatorName: roomState.players[currentNomination.nominatorUid]?.name || "Unknown",
      yesCount: yesCount,
      voterNames: voterNames,
      voterUids: voterUids
    };

    const history = roomState.nominationHistory || [];
    updates[`public/rooms/${roomId}/nominationHistory`] = [...history, record];

    if (yesCount >= majorityNeeded && yesCount > currentHighest) {
       updates[`public/rooms/${roomId}/highestVotes`] = yesCount;
       updates[`public/rooms/${roomId}/executionTargetUid`] = currentNomination.targetUid;
    } else if (yesCount >= majorityNeeded && yesCount === currentHighest) {
       updates[`public/rooms/${roomId}/executionTargetUid`] = null;
    }
    updates[`public/rooms/${roomId}/status`] = 'day';
    updates[`public/rooms/${roomId}/nominations`] = null;
    await update(ref(database), updates);
  };

  const finalizeDay = async () => {
    if (!isST || !secretState || !roomState) return;
    const pubClone = JSON.parse(JSON.stringify(roomState));
    const secClone = JSON.parse(JSON.stringify(secretState));
    const targetUid = pubClone.executionTargetUid;
    const targetSecret = targetUid ? secClone.players[targetUid] : null;
    const updates: Record<string, any> = {};

    if (targetUid) {
       let finalExecutionUid: string | null = targetUid;
       if (targetSecret?.character === 'mayor' && !targetSecret.isPoisoned && !targetSecret.isDrunk) {
          const alivePlayers = Object.values(pubClone.players).filter((p: any) => !p.isDead && p.uid !== targetUid);
          let promptText = `처형 대상이 시장(${roomState.players[targetUid].name})입니다.\n시장의 능력으로 다른 플레이어를 대신 처형하려면 아래 번호를 입력하세요.\n아무도 죽지 않게 하려면 0을, 시장 본인이 그대로 처형되게 하려면 아무것도 입력하지 않고 '확인'을 누르거나 '취소'를 누르세요.\n\n0: 아무도 처형하지 않음 (생존)\n`;
          alivePlayers.forEach((p: any, idx: number) => {
             promptText += `${idx + 1}: ${p.name}\n`;
          });
          const result = window.prompt(promptText);
          
          if (result !== null && result.trim() !== '') {
             const choice = parseInt(result.trim());
             if (choice === 0) {
                finalExecutionUid = null;
                alert(`아무도 처형되지 않고 밤이 됩니다.`);
             } else if (choice > 0 && choice <= alivePlayers.length) {
                finalExecutionUid = (alivePlayers[choice - 1] as any).uid;
                alert(`시장 대신 ${(alivePlayers[choice - 1] as any).name} 님이 처형됩니다.`);
             }
          }
       }

       if (finalExecutionUid) {
          const finalSecret = secClone.players[finalExecutionUid];
          pubClone.players[finalExecutionUid].isDead = true;
          pubClone.players[finalExecutionUid].hasGhostVote = true;
          pubClone.lastExecutedUid = finalExecutionUid;
          
          if (finalSecret?.character === 'imp') {
             const inherited = handleDemonDeath(pubClone, secClone, false, finalExecutionUid);
             if (inherited) {
                secClone.dayLogs = secClone.dayLogs || {};
                secClone.dayLogs[roomState.dayNumber] = secClone.dayLogs[roomState.dayNumber] || { nominations: [], executedUid: null, abilityLogs: [] };
                secClone.dayLogs[roomState.dayNumber].abilityLogs = secClone.dayLogs[roomState.dayNumber].abilityLogs || [];
                secClone.dayLogs[roomState.dayNumber].abilityLogs.push(`※ [시스템] 조건 충족으로 새로운 악마(임프)가 계승되었습니다.`);
             }
          }

          if (finalSecret?.character === 'saint' && !finalSecret.isPoisoned && !finalSecret.isDrunk) {
             pubClone.status = 'end';
             pubClone.winner = 'evil';
             pubClone.winReason = '성자 처형';
             updates[`public/rooms/${roomId}`] = pubClone;
             updates[`secret/rooms/${roomId}`] = secClone;
             await update(ref(database), updates);
             return;
          }
       }

       const winResult = checkWinCondition(pubClone, secClone);
       if (winResult) {
          pubClone.status = 'end';
          pubClone.winner = winResult.winner;
          pubClone.winReason = winResult.reason;
       } else {
          pubClone.status = 'night';
          pubClone.dayNumber += 1;
       }
    } else {
       const finalAlive = players.filter(p => !p.isDead);
       const isMayorAlive = finalAlive.some(p => secClone.players[p.uid]?.character === 'mayor');
       if (finalAlive.length === 3 && isMayorAlive) {
          if (window.confirm("시장 승리 조건 충족. 게임을 종료할까요?")) {
             pubClone.status = 'end';
             pubClone.winner = 'good';
             pubClone.winReason = '시장 생존 (생존자 3인 남음)';
          } else {
             pubClone.status = 'night';
             pubClone.dayNumber += 1;
          }
       } else {
          pubClone.status = 'night';
          pubClone.dayNumber += 1;
       }
    }

    if (pubClone.status === 'night' || pubClone.status === 'end') {
       secClone.dayLogs = secClone.dayLogs || {};
       
       const aliveGood = Object.values(pubClone.players).filter((p: any) => !p.isDead && secClone.players[p.uid]?.alignment === 'good').length;
       const aliveEvil = Object.values(pubClone.players).filter((p: any) => !p.isDead && secClone.players[p.uid]?.alignment === 'evil').length;

       secClone.dayLogs[roomState.dayNumber] = {
          ...secClone.dayLogs[roomState.dayNumber],
          nominations: pubClone.nominationHistory || [],
          executedUid: pubClone.executionTargetUid || null,
          abilityLogs: secClone.dayLogs[roomState.dayNumber]?.abilityLogs || [],
          aliveGood: secClone.dayLogs[roomState.dayNumber]?.aliveGood ?? aliveGood,
          aliveEvil: secClone.dayLogs[roomState.dayNumber]?.aliveEvil ?? aliveEvil
       };
    }

    if (pubClone.status === 'end') {
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
          winReason: pubClone.winReason || '알 수 없는 이유',
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
    }

    if (pubClone.status === 'night') {
       updates[`public/rooms/${roomId}/highestVotes`] = 0;
       updates[`public/rooms/${roomId}/executionTargetUid`] = null;
       updates[`public/rooms/${roomId}/usedNominators`] = [];
       updates[`public/rooms/${roomId}/usedTargets`] = [];
       updates[`public/rooms/${roomId}/nominationHistory`] = [];
    }

    updates[`public/rooms/${roomId}/status`] = pubClone.status;
    updates[`public/rooms/${roomId}/dayNumber`] = pubClone.dayNumber;
    if (pubClone.status === 'end') {
       updates[`public/rooms/${roomId}/winner`] = pubClone.winner;
       updates[`public/rooms/${roomId}/winReason`] = pubClone.winReason;
       updates[`public/rooms/${roomId}/winningPlayers`] = pubClone.winningPlayers;
    }
    if (targetUid) {
       updates[`public/rooms/${roomId}/players/${targetUid}/isDead`] = true;
       updates[`public/rooms/${roomId}/players/${targetUid}/hasGhostVote`] = true;
       updates[`public/rooms/${roomId}/lastExecutedUid`] = targetUid;
    }

    updates[`secret/rooms/${roomId}`] = secClone;
    await update(ref(database), updates);
  };

  const hasPendingSlayerShot = Object.values(events).some((e: any) => e.type === 'slayer_shot' && e.actorUid === user.uid && e.status === 'pending');

  const handleSlayerShot = async (targetUid: string) => {
    if (isST || myRole !== 'slayer' || playerSecret?.isUsed || hasPendingSlayerShot) return;
    const targetName = roomState.players[targetUid].name;
    if (window.confirm(`${targetName}님에게 슬레이어 능력을 사용하시겠습니까? (이 능력은 게임 중 단 한 번만 사용 가능합니다.)`)) {
       const eventId = Date.now().toString();
       const updates: Record<string, any> = {};
       updates[`public/rooms/${roomId}/events/${eventId}`] = {
          type: 'slayer_shot',
          actorUid: user.uid,
          actorName: roomState.players[user.uid].name,
          targetUid: targetUid,
          targetName: targetName,
          timestamp: Date.now(),
          status: 'pending'
       };
       await update(ref(database), updates);
    }
  };

  // Removed manual handleResolveSlayer

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg animate-fade-in pb-20 px-0 sm:px-0">
      
      {!isST && (
        <PlayerIdentity 
          character={playerSecret?.character || null}
          fakeCharacter={playerSecret?.fakeCharacter}
          alignment={playerSecret?.alignment || null}
          evilTeamInfo={playerSecret?.evilTeamInfo}
        />
      )}

      <TownSquare />

      {isST && lastEvent && lastEvent.type === 'slayer_shot' && (Date.now() - lastEvent.timestamp < 60000) && (
        <div className="bg-rose-600 text-white p-8 rounded-[2.5rem] shadow-2xl animate-bounce text-center space-y-4 mx-4 sm:mx-0">
           <div><p className="text-xs font-black uppercase opacity-80 mb-2 tracking-widest">Slayer Shot Result</p><p className="text-2xl font-black">{lastEvent.actorName} {'->'} {lastEvent.targetName}</p></div>
           <div className="flex gap-3">
              {lastEvent.status === 'dead' && lastEventId && <Button onClick={() => update(ref(database), { [`public/rooms/${roomId}/events/${lastEventId}`]: null })} variant="primary" className="flex-1 bg-white text-rose-600 font-black h-16 flex items-center justify-center rounded-xl text-xl">DEAD (닫기)</Button>}
              {lastEvent.status === 'miss' && lastEventId && <Button onClick={() => update(ref(database), { [`public/rooms/${roomId}/events/${lastEventId}`]: null })} variant="secondary" className="flex-1 bg-rose-900 text-white border-transparent font-black h-16 flex items-center justify-center rounded-xl text-xl">MISS (닫기)</Button>}
              {lastEvent.status === 'pending' && lastEventId && (
                 <Button onClick={() => handleResolveSlayer(lastEventId, lastEvent)} variant="primary" className="flex-1 bg-slate-950 text-white border-transparent h-16 font-black tracking-widest">판독 결과 확인 (Confirm)</Button>
              )}
           </div>
        </div>
      )}

      <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-slate-800 backdrop-blur flex justify-between items-center shadow-lg mx-4 sm:mx-0">
        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter font-serif">{roomState.dayNumber}일차 낮</h2>
        {roomState.executionTargetUid && (
          <div className="text-right">
            <p className="text-xs text-rose-500 font-black uppercase tracking-widest">Candidate</p>
            <p className="text-base text-white font-bold">{roomState.players[roomState.executionTargetUid]?.name}</p>
          </div>
        )}
      </div>

      {isVoting && currentNomination && (
        <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-sky-500/30 text-center relative overflow-hidden shadow-2xl animate-fade-in mx-4 sm:mx-0">
          <h3 className="text-sky-400 font-black uppercase text-sm tracking-[0.3em] mb-6">투표 진행 중</h3>
          <p className="text-slate-300 mb-8 leading-tight">
             <span className="text-slate-500 text-sm uppercase font-bold mb-2 block tracking-widest">지목자: {roomState.players[currentNomination.nominatorUid]?.name}</span>
             <span className="font-black text-white text-3xl uppercase tracking-tighter border-b-4 border-sky-500/20 pb-1 inline-block">{roomState.players[currentNomination.targetUid]?.name}</span>
          </p>
          <div className="flex justify-center mb-10">
            <div className="flex flex-col items-center bg-slate-900/60 p-8 rounded-[2rem] border border-sky-500/20 shadow-inner relative min-w-[160px]">
              <span className="text-4xl font-black text-sky-400 mb-3">{yesCount}</span>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">찬성 (최소 필요: {majorityNeeded})</span>
              {roomState.players[user.uid]?.isDead && roomState.players[user.uid]?.hasGhostVote && (
                 <div className="absolute -top-4 bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full animate-pulse shadow-lg">유령 투표권 있음</div>
              )}
              {roomState.players[user.uid]?.isDead && !roomState.players[user.uid]?.hasGhostVote && voters[user.uid] === true && (
                 <div className="absolute -top-4 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">투표권 소모됨</div>
              )}
            </div>
          </div>
          {!isST ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-4">
                {voters[user.uid] === true ? (
                  <Button 
                    onClick={() => handleVote(false)} 
                    variant="danger" 
                    size="lg" 
                    className="flex-1 font-black h-20 text-xl shadow-xl transition-all border-rose-500/30"
                  >
                    투표 취소 (Cancel)
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleVote(true)} 
                    variant="primary" 
                    size="lg" 
                    className="flex-1 font-black h-20 text-xl shadow-xl transition-all"
                    disabled={(playerSecret?.fakeCharacter || playerSecret?.character) === 'butler' && !roomState.players[user.uid]?.isDead ? (!playerSecret?.butlerMasterUid || voters[playerSecret.butlerMasterUid] !== true) : false}
                  >
                    찬성 투표 (Vote)
                  </Button>
                )}
              </div>
              {(playerSecret?.fakeCharacter || playerSecret?.character) === 'butler' && !roomState.players[user.uid]?.isDead && (
                 <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">집사 제약 (Butler Restriction)</p>
                    <p className="text-sm text-slate-300 font-medium">
                      {playerSecret?.butlerMasterUid 
                        ? voters[playerSecret.butlerMasterUid] === true
                           ? <span className="text-emerald-400">주인({roomState.players[playerSecret.butlerMasterUid]?.name})이 찬성했습니다. 이제 투표할 수 있습니다!</span>
                           : <span className="text-amber-400/80">주인({roomState.players[playerSecret.butlerMasterUid]?.name})의 찬성 투표를 기다리고 있습니다...</span>
                        : <span className="text-rose-400">어젯밤 주인을 선택하지 않아 오늘 투표할 수 없습니다.</span>
                      }
                    </p>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               {isButlerVotingIllegally && (
                  <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-2xl mb-2 text-center animate-pulse">
                     <p className="text-sm font-black text-rose-400 uppercase tracking-widest mb-1">⚠️ 룰 위반 경고</p>
                     <p className="text-xs text-rose-200">
                        집사(<span className="font-bold">{butlerPlayer?.name}</span>)가 찬성했지만, 
                        주인(<span className="font-bold">{roomState.players[masterUid || '']?.name || '알 수 없음'}</span>)이 찬성을 취소했습니다. 
                        집사가 스스로 투표를 취소하도록 안내해 주세요.
                     </p>
                  </div>
               )}
               <div className="flex flex-col gap-3">
                  <Button onClick={endVoting} variant="primary" size="lg" className="w-full font-black uppercase h-16 shadow-xl border-transparent">투표 결과 확정</Button>
                  <Button onClick={handleCancelNomination} variant="ghost" className="w-full text-xs text-slate-500 uppercase tracking-widest font-black underline underline-offset-8 decoration-slate-800">투표 취소 및 돌아가기</Button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Slayer Shot */}
      {!isST && myRole === 'slayer' && !roomState.players[user.uid]?.isDead && !playerSecret?.isUsed && !hasPendingSlayerShot && (
         <div className="bg-rose-950/30 p-8 rounded-[3rem] border border-rose-500/30 text-center shadow-2xl mt-4 space-y-6 relative overflow-hidden mx-4 sm:mx-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/20 animate-pulse"></div>
            <p className="text-sm text-rose-500 font-black uppercase tracking-[0.4em] mb-2">Execute Slayer's Shot</p>
            <div className="grid grid-cols-1 gap-2">
               {players.filter(p => !p.isDead && p.uid !== user.uid).map(p => (
                 <Button key={p.uid} onClick={() => handleSlayerShot(p.uid)} variant="danger" className="w-full font-black uppercase tracking-widest h-14 text-base shadow-xl border-transparent">KILL {p.name}</Button>
               ))}
            </div>
         </div>
      )}

      {/* Nomination History */}
      <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-800 backdrop-blur shadow-xl mt-4 mx-4 sm:mx-0">
         <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">오늘의 투표 기록</h3>
         <div className="space-y-4">
            {roomState.nominationHistory && roomState.nominationHistory.length > 0 ? (
               roomState.nominationHistory.map((record, i) => (
                 <div key={i} className="bg-slate-950/50 p-4 rounded-[1.5rem] border border-slate-800/50 animate-fade-in shadow-inner">
                    <div className="flex justify-between items-start mb-3">
                       <div className="flex flex-col">
                          <span className="text-xs text-slate-600 font-black uppercase tracking-widest">지목자</span>
                          <span className="text-sm font-bold text-slate-400">{record.nominatorName}</span>
                       </div>
                       <div className="text-sky-500 text-xs mt-2 animate-pulse" aria-hidden="true">▶</div>
                       <div className="flex flex-col text-right">
                          <span className="text-xs text-slate-600 font-black uppercase tracking-widest">대상</span>
                          <span className="text-sm font-bold text-sky-400">{record.targetName}</span>
                       </div>
                    </div>
                    <div className="pt-3 border-t border-slate-900/50 flex justify-between items-center">
                       <div className="flex flex-col">
                          <span className="text-xs text-slate-600 font-black uppercase mb-1">찬성 수 ({record.yesCount})</span>
                          <p className="text-xs text-slate-500 italic max-w-[200px] truncate">{(record.voterNames || []).join(', ') || '없음'}</p>
                       </div>
                       {record.yesCount >= majorityNeeded && (
                          <span className="text-xs bg-rose-900/30 text-rose-500 border border-rose-900/50 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">처형 위기</span>
                       )}
                    </div>
                 </div>
               ))
            ) : (
               <p className="text-xs text-slate-600 italic text-center py-10 font-black uppercase tracking-widest opacity-50">오늘은 진행된 투표가 없습니다.</p>
            )}
         </div>

         {/* Admin skip/finalize button always visible for ST */}
         {isST && !isVoting && (
            <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-10 font-black uppercase tracking-[0.2em] h-16 shadow-2xl border-transparent">
               {roomState.executionTargetUid ? '처형 후 밤이 됩니다' : '처형 없이 밤이 됩니다'}
            </Button>
         )}
      </div>

      {!isST && (
        <PlayerRecords 
          messageHistory={playerSecret?.messageHistory}
        />
      )}
    </div>
  );
}
