
import { database } from '../lib/firebase';
import { ref, update, get } from 'firebase/database';
import { handleDemonDeath, checkWinCondition } from '../lib/gameLogic';

export function useVotingLogic(
  roomId: string | null,
  roomState: any,
  secretState: any,
  user: any,
  isST: boolean,
  playerSecret: any
) {


  const players = roomState?.players ? Object.values(roomState.players).sort((a: any, b: any) => a.seatIndex - b.seatIndex) : [];
  const alivePlayers = players.filter((p: any) => !p.isDead);
  const majorityNeeded = Math.ceil(alivePlayers.length / 2);

  const currentNominationKey = roomState?.nominations ? Object.keys(roomState.nominations)[0] : null;
  const currentNomination = currentNominationKey && roomState.nominations ? roomState.nominations[currentNominationKey] : null;
  const voters = currentNomination?.voters || {};
  const yesCount = Object.values(voters).filter(v => v === true).length;

  const usedNominators = roomState?.usedNominators || [];
  const usedTargets = roomState?.usedTargets || [];

  const handleResolveSlayer = async (eventId: string, event: any) => {
    if (!isST || !secretState || !roomState || !roomId) return;
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
       if (!event.isFake && !isMisinformed && isTargetImp) {
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
       updates[`public/rooms/${roomId}/hasSlayerShotFired`] = true;
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

  const handleCancelNomination = async () => {
    if (!isST || !currentNomination || !roomId) return;
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/status`] = 'day';
    updates[`public/rooms/${roomId}/nominations`] = null;
    updates[`public/rooms/${roomId}/usedNominators`] = usedNominators.filter((u: string) => u !== currentNomination.nominatorUid);
    updates[`public/rooms/${roomId}/usedTargets`] = usedTargets.filter((u: string) => u !== currentNomination.targetUid);
    await update(ref(database), updates);
  };

  const handleVote = async (vote: boolean) => {
    if (isST || !currentNominationKey || !currentNomination || !roomId || !user) return;
    
    const myPlayer = roomState.players[user.uid];
    const myRole = playerSecret?.fakeCharacter || playerSecret?.character;

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
    if (!isST || !currentNominationKey || !currentNomination || !roomId) return;
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

  const executeAndTransition = async (finalExecutionUid: string | null) => {
    if (!isST || !secretState || !roomState || !roomId) return;
    
    // 동시성(Concurrency) 방어: 낮/밤 전환 등 중대한 변경 시, 
    // 로컬 상태가 아닌 서버의 최신 상태를 강제로 가져와서 Race Condition을 최소화합니다.
    const latestPubSnap = await get(ref(database, `public/rooms/${roomId}`));
    const latestSecSnap = await get(ref(database, `secret/rooms/${roomId}`));
    
    const pubClone = latestPubSnap.exists() ? latestPubSnap.val() : JSON.parse(JSON.stringify(roomState));
    const secClone = latestSecSnap.exists() ? latestSecSnap.val() : JSON.parse(JSON.stringify(secretState));
    
    const targetUid = pubClone.executionTargetUid;
    const updates: Record<string, any> = {};

    if (targetUid) {
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
          } else {
             const winResult = checkWinCondition(pubClone, secClone);
             if (winResult) {
                pubClone.status = 'end';
                pubClone.winner = winResult.winner;
                pubClone.winReason = winResult.reason;
             } else {
                pubClone.status = 'night';
                pubClone.dayNumber += 1;
             }
          }
       }
    }
    
    if (!targetUid || (targetUid && pubClone.status === 'day')) {
       const finalAlive = players.filter((p: any) => !p.isDead);
       const isMayorAlive = finalAlive.some((p: any) => secClone.players[p.uid]?.character === 'mayor');
       if (finalAlive.length === 3 && isMayorAlive) {
          if (window.confirm("시장 승리 조건 충족(오늘 아무도 처형되지 않음). 게임을 종료할까요?")) {
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
       }).filter((p: any) => p.alignment === pubClone.winner);
       
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
    if (finalExecutionUid) {
       updates[`public/rooms/${roomId}/players/${finalExecutionUid}/isDead`] = true;
       updates[`public/rooms/${roomId}/players/${finalExecutionUid}/hasGhostVote`] = true;
       updates[`public/rooms/${roomId}/lastExecutedUid`] = finalExecutionUid;
    }

    updates[`secret/rooms/${roomId}`] = secClone;
    await update(ref(database), updates);
  };

  const finalizeDay = async () => {
    if (!isST || !secretState || !roomState) return;
    const targetUid = roomState.executionTargetUid || null;
    executeAndTransition(targetUid);
  };

  const handleSlayerShot = async (targetUid: string) => {
    if (isST || !playerSecret || !roomState || !roomId || !user) return;
    const myRole = playerSecret?.fakeCharacter || playerSecret?.character;
    const isEvil = playerSecret?.alignment === 'evil';
    const isRealSlayer = myRole === 'slayer';
    
    const events = roomState?.events || {};
    const hasPendingSlayerShot = Object.values(events).some((e: any) => e.type === 'slayer_shot' && e.actorUid === user.uid && e.status === 'pending');
    
    if ((!isRealSlayer && !isEvil) || playerSecret?.isUsed || hasPendingSlayerShot) return;

    const targetName = roomState.players[targetUid].name;
    const hasPastSlayerShot = roomState.hasSlayerShotFired === true;
    
    let confirmMsg = `${targetName}님에게 슬레이어 능력을 사용하시겠습니까? (이 능력은 게임 중 단 한 번만 사용 가능합니다.)`;
    if (!isRealSlayer && isEvil) {
       confirmMsg = `[악의 진영 전용] ${targetName}님에게 '거짓 슬레이어' 능력을 사용하시겠습니까?\n무조건 '빗나감(MISS)' 처리됩니다.`;
       if (hasPastSlayerShot) {
          confirmMsg += `\n\n⚠️ 경고: 이전에 이미 진짜든 가짜든 슬레이어 능력이 발동된 기록이 있습니다! 지금 총을 쏘면 거짓말임이 명백히 들통날 수 있습니다. 그래도 쏘시겠습니까?`;
       }
    }

    if (window.confirm(confirmMsg)) {
       const eventId = Date.now().toString();
       const updates: Record<string, any> = {};
       updates[`public/rooms/${roomId}/events/${eventId}`] = {
          type: 'slayer_shot',
          actorUid: user.uid,
          actorName: roomState.players[user.uid].name,
          targetUid: targetUid,
          targetName: targetName,
          timestamp: Date.now(),
          status: 'pending',
          isFake: !isRealSlayer
       };
       await update(ref(database), updates);
    }
  };

  return {
    handleResolveSlayer,
    handleCancelNomination,
    handleVote,
    endVoting,
    executeAndTransition,
    finalizeDay,
    handleSlayerShot,
    majorityNeeded,
    yesCount,
  };
}
