import type { PublicRoomState, SecretRoomState } from '../types/game';
import type { RoleType } from '../types/character';
import { getRoleName } from '../constants/roles';

const isDemon = (character: RoleType | null) => character === 'imp';
const isEvil = (alignment: string | null) => alignment === 'evil';

/**
 * Trouble Brewing 정보 직업들에 대한 오정보/진실 정보를 생성하는 핵심 엔진
 */
export function getNightSuggestions(publicState: PublicRoomState, secretState: SecretRoomState, newPublicState: PublicRoomState = publicState) {
  const suggestions: Record<string, { message: string, warning?: string }> = {};
  const { players: secretPlayers, evilInfo } = secretState;
  const { players: pubPlayers, dayNumber, lastExecutedUid } = publicState;
  const orderedPubPlayers = Object.values(pubPlayers).sort((a, b) => a.seatIndex - b.seatIndex);

  Object.entries(secretPlayers).forEach(([uid, player]) => {
    const isMisinformed = player.isPoisoned || player.isDrunk;
    const effectiveCharacter = player.isDrunk ? player.fakeCharacter : player.character; 
    if (!effectiveCharacter || pubPlayers[uid]?.isDead) return;

    switch (effectiveCharacter) {
      case 'washerwoman':
        if (dayNumber === 1) {
          const townsfolk = Object.entries(secretPlayers).filter(([pUid, p]) => p.alignment === 'good' && pUid !== uid && p.character !== 'drunk' && p.character !== 'washerwoman');
          if (townsfolk.length > 0) {
            const target = townsfolk[Math.floor(Math.random() * townsfolk.length)];
            const decoyCandidates = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0]);
            const decoy = decoyCandidates[Math.floor(Math.random() * decoyCandidates.length)];
            const msg = isMisinformed 
              ? `${pubPlayers[decoy[0]]?.name} 또는 ${pubPlayers[uid]?.name}(본인) 중 한 명은 세탁부입니다.` 
              : `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${getRoleName(target[1].character)}입니다.`;
              
            const hasSpyOrRecluse = secretPlayers[target[0]]?.character === 'spy' || secretPlayers[target[0]]?.character === 'recluse' || secretPlayers[decoy[0]]?.character === 'spy' || secretPlayers[decoy[0]]?.character === 'recluse';
            suggestions[uid] = { 
               message: msg,
               warning: hasSpyOrRecluse ? '제안된 플레이어 중에 스파이 또는 은둔자가 있습니다. 직업 정보를 다르게 알려줄지 판단하세요.' : undefined
            };
          }
        }
        break;

      case 'librarian':
        if (dayNumber === 1) {
          const outsiders = Object.entries(secretPlayers).filter(([_, p]) => p.alignment === 'good' && p.character !== 'drunk' && (p.character === 'butler' || p.character === 'saint' || p.character === 'recluse'));
          if (outsiders.length > 0) {
            const target = outsiders[Math.floor(Math.random() * outsiders.length)];
            const decoyCandidates = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0]);
            const decoy = decoyCandidates[Math.floor(Math.random() * decoyCandidates.length)];
            const msg = isMisinformed 
              ? `${pubPlayers[decoy[0]]?.name} 또는 ${pubPlayers[uid]?.name}(본인) 중 한 명은 사서입니다.` 
              : `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${getRoleName(target[1].character)}입니다.`;
              
            const hasSpyOrRecluse = secretPlayers[target[0]]?.character === 'spy' || secretPlayers[target[0]]?.character === 'recluse' || secretPlayers[decoy[0]]?.character === 'spy' || secretPlayers[decoy[0]]?.character === 'recluse';
            suggestions[uid] = { 
               message: msg,
               warning: hasSpyOrRecluse ? '제안된 플레이어 중에 스파이 또는 은둔자가 있습니다. 직업 정보를 다르게 알려줄지 판단하세요.' : undefined
            };
          } else {
            suggestions[uid] = { message: isMisinformed ? "이 게임에는 1명의 외부인이 있습니다." : "이 게임에 외부인은 없습니다." };
          }
        }
        break;

      case 'investigator':
        if (dayNumber === 1) {
          const minions = Object.entries(secretPlayers).filter(([_, p]) => p.alignment === 'evil' && p.character !== 'imp');
          if (minions.length > 0) {
            const target = minions[Math.floor(Math.random() * minions.length)];
            const decoyCandidates = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0]);
            const decoy = decoyCandidates[Math.floor(Math.random() * decoyCandidates.length)];
            const msg = isMisinformed 
              ? `${pubPlayers[decoy[0]]?.name} 또는 ${pubPlayers[uid]?.name}(본인) 중 한 명은 조사관입니다.` 
              : `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${getRoleName(target[1].character)}입니다.`;
              
            const hasSpyOrRecluse = secretPlayers[target[0]]?.character === 'spy' || secretPlayers[target[0]]?.character === 'recluse' || secretPlayers[decoy[0]]?.character === 'spy' || secretPlayers[decoy[0]]?.character === 'recluse';
            suggestions[uid] = { 
               message: msg,
               warning: hasSpyOrRecluse ? '제안된 플레이어 중에 스파이 또는 은둔자가 있습니다. 직업 정보를 다르게 알려줄지 판단하세요.' : undefined
            };
          }
        }
        break;

      case 'chef':
        if (dayNumber === 1) {
          let evilPairs = 0;
          let hasSpyOrRecluse = false;
          for (let i = 0; i < orderedPubPlayers.length; i++) {
            const current = orderedPubPlayers[i];
            const next = orderedPubPlayers[(i + 1) % orderedPubPlayers.length];
            const char1 = secretPlayers[current.uid]?.character;
            const char2 = secretPlayers[next.uid]?.character;
            if (char1 === 'spy' || char1 === 'recluse' || char2 === 'spy' || char2 === 'recluse') hasSpyOrRecluse = true;
            if (isEvil(secretPlayers[current.uid]?.alignment) && isEvil(secretPlayers[next.uid]?.alignment)) evilPairs++;
          }
          suggestions[uid] = { 
             message: `악의 진영 이웃 쌍의 수: ${isMisinformed ? (evilPairs + 1) % 3 : evilPairs}`,
             warning: hasSpyOrRecluse ? '스파이 또는 은둔자가 포함되어 있습니다. 쌍의 수를 다르게 알려줄지 판단하세요.' : undefined
          };
        }
        break;

      case 'empath':
        const alivePlayers = orderedPubPlayers.filter(p => !p.isDead || p.uid === uid);
        const myIndex = alivePlayers.findIndex(p => p.uid === uid);
        if (myIndex !== -1) {
          const prevPlayer = alivePlayers[(myIndex - 1 + alivePlayers.length) % alivePlayers.length];
          const nextPlayer = alivePlayers[(myIndex + 1) % alivePlayers.length];
          let evilCount = 0;
          let hasSpyOrRecluse = false;
          
          const char1 = secretPlayers[prevPlayer.uid]?.character;
          const char2 = secretPlayers[nextPlayer.uid]?.character;
          if (char1 === 'spy' || char1 === 'recluse' || char2 === 'spy' || char2 === 'recluse') hasSpyOrRecluse = true;

          if (isEvil(secretPlayers[prevPlayer.uid]?.alignment)) evilCount++;
          if (isEvil(secretPlayers[nextPlayer.uid]?.alignment)) evilCount++;
          suggestions[uid] = { 
             message: `당신의 양옆에 있는 악마 기운: ${isMisinformed ? (evilCount === 0 ? 1 : 0) : evilCount}`,
             warning: hasSpyOrRecluse ? '양옆에 스파이 또는 은둔자가 있습니다. 악마 기운의 수를 다르게 알려줄지 판단하세요.' : undefined
          };
        }
        break;

      case 'undertaker':
        if (lastExecutedUid) {
          const realRole = secretPlayers[lastExecutedUid]?.character;
          const fakeRoles: RoleType[] = ['imp', 'poisoner', 'fortune_teller', 'mayor'];
          const hasSpyOrRecluse = realRole === 'spy' || realRole === 'recluse';
          suggestions[uid] = { 
             message: `오늘 처형된 자의 정체: ${isMisinformed ? getRoleName(fakeRoles[Math.floor(Math.random() * fakeRoles.length)]) : getRoleName(realRole)}`,
             warning: hasSpyOrRecluse ? '처형된 자가 스파이 또는 은둔자입니다. 다른 직업으로 알려줄지 판단하세요.' : undefined
          };
        }
        break;

      case 'fortune_teller':
        const action = secretState.nightActions?.[uid];
        if (action?.targetUid && action?.target2Uid) {
          const char1 = secretPlayers[action.targetUid]?.character;
          const char2 = secretPlayers[action.target2Uid]?.character;
          const isT1Evil = isDemon(char1) || secretPlayers[action.targetUid]?.isRedHerring;
          const isT2Evil = isDemon(char2) || secretPlayers[action.target2Uid]?.isRedHerring;
          const realAnswer = isT1Evil || isT2Evil;
          
          const hasSpyOrRecluse = char1 === 'spy' || char1 === 'recluse' || char2 === 'spy' || char2 === 'recluse';
          
          suggestions[uid] = { 
             message: ((isMisinformed ? !realAnswer : realAnswer) ? 'Yes' : 'No'),
             warning: hasSpyOrRecluse ? '대상 중에 스파이 또는 은둔자가 포함되어 있습니다. 악마 판정 결과를 다르게 알려줄지 판단하세요.' : undefined
          };
        }
        break;

      case 'ravenkeeper': {
        const wasAlive = !publicState.players[uid]?.isDead;
        const isDeadNow = newPublicState.players[uid]?.isDead;
        if (wasAlive && isDeadNow) {
           const rAction = secretState.nightActions?.[uid];
           if (rAction?.targetUid) {
              const targetCharacter = secretPlayers[rAction.targetUid]?.character;
              const fakeRoles: RoleType[] = ['imp', 'poisoner', 'fortune_teller', 'mayor'];
              const charName = isMisinformed ? getRoleName(fakeRoles[Math.floor(Math.random() * fakeRoles.length)]) : getRoleName(targetCharacter);
              const hasSpyOrRecluse = targetCharacter === 'spy' || targetCharacter === 'recluse';
              
              suggestions[uid] = { 
                 message: `당신이 밤에 사망하여 선택한 자의 정체를 확인합니다: ${charName}`,
                 warning: hasSpyOrRecluse ? '확인한 대상이 스파이 또는 은둔자입니다. 다른 직업으로 알려줄지 판단하세요.' : undefined
              };
           }
        }
        break;
      }
        
      case 'butler':
        const butlerAction = secretState.nightActions?.[uid];
        if (butlerAction?.targetUid) {
           suggestions[uid] = { message: `당신이 선택한 주인: ${pubPlayers[butlerAction.targetUid]?.name}` };
        }
        break;
    }
  });

  if (dayNumber === 1 && evilInfo) {
    const minionNames = evilInfo.minionUids.map(u => pubPlayers[u]?.name).join(', ');
    suggestions[evilInfo.demonUid] = { message: `[악마 정보] 하수인: ${minionNames || '없음'} | 가짜직업: ${evilInfo.bluffs.map(b => getRoleName(b)).join(', ')}` };
    evilInfo.minionUids.forEach(mUid => {
      suggestions[mUid] = { message: `[하수인 정보] 악마: ${pubPlayers[evilInfo.demonUid]?.name}` };
    });
  }

  return suggestions;
}

export function resolveNightActions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const newPublicState: PublicRoomState = JSON.parse(JSON.stringify(publicState));
  const newSecretState: SecretRoomState = JSON.parse(JSON.stringify(secretState));
  const actions = newSecretState.nightActions || {};
  const protectedUids = new Set<string>();

  Object.keys(newSecretState.players).forEach(uid => {
    newSecretState.players[uid].isPoisoned = false;
  });

  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    if (p.character === 'poisoner' && !p.isPoisoned && !p.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) newSecretState.players[action.targetUid].isPoisoned = true;
    }
  });

  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    if (p.character === 'monk' && !p.isPoisoned && !p.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) protectedUids.add(action.targetUid);
    }
  });

  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    if (p.character === 'imp' && !p.isPoisoned && !p.isDrunk && !newPublicState.players[uid].isDead && publicState.dayNumber > 1) {
      if (action.targetUid && !protectedUids.has(action.targetUid)) {
        const targetSecret = newSecretState.players[action.targetUid];
        if (targetSecret?.character !== 'soldier') {
          newPublicState.players[action.targetUid].isDead = true;
          newPublicState.players[action.targetUid].hasGhostVote = true;
        }
      }
    }
  });

  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    const effectiveCharacter = p.fakeCharacter || p.character;
    if (effectiveCharacter === 'butler' && !newPublicState.players[uid].isDead) {
      if (action.targetUid) newSecretState.players[uid].butlerMasterUid = action.targetUid;
    }
  });

  // 3. 악마 계승 및 승리 조건 체크는 STNightDashboard.tsx에서 ST가 사망자를 확정한 후에 수행하도록 위임합니다.

  const suggestions = getNightSuggestions(publicState, secretState, newPublicState);
  newSecretState.nightResults = { ...(newSecretState.nightResults || {}), ...suggestions };

  newSecretState.nightActions = {};
  return { newPublicState, newSecretState };
}
