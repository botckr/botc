import { getRoleName } from '../../constants/roles';
import type { GameHistory } from '../../types/game';

const NIGHT_ORDER = [
  'poisoner', 'monk', 'scarlet_woman', 'imp', 'ravenkeeper', 
  'washerwoman', 'librarian', 'investigator', 'chef', 
  'undertaker', 'empath', 'fortune_teller', 'butler', 'spy'
];

export const getFormattedRole = (p: any, evilInfo?: any) => {
  let orig = p.originalCharacter;
  if (!orig && evilInfo) {
    if (p.uid === evilInfo.demonUid) orig = 'imp';
    if (evilInfo.minionUids?.includes(p.uid) && p.character === 'imp') orig = 'scarlet_woman';
  }

  let roleText = getRoleName(p.character);
  if (orig && orig !== p.character && p.character !== 'dead_imp') {
    roleText = `${getRoleName(orig)} -> ${getRoleName(p.character)}`;
  } else if (orig && p.character === 'dead_imp') {
    roleText = `${getRoleName(orig)} -> ${getRoleName('imp')}(사망)`;
  }
  
  if (p.fakeCharacter) roleText = `주정뱅이(착각: ${getRoleName(p.fakeCharacter)})`;
  return roleText;
};

export const formatNightMessage = (msg: string) => {
  const lines = msg.split('\n').map(l => l.trim());
  return lines.filter(l => !l.endsWith('없음')).join('\n  ');
};

export const getSortedNightPlayers = (players: any[], nightIdx: number) => {
  return [...players]
    .filter(p => {
      const msg = p.messageHistory?.[nightIdx];
      if (!msg) return false;
      const lines = msg.split('\n').map((l: string) => l.trim());
      const hasAction = lines.some((l: string) => l.startsWith('행동:') && !l.includes('없음'));
      const hasInfo = lines.some((l: string) => l.startsWith('수신 정보:') && !l.includes('없음'));
      const isStandardFormat = lines.some((l: string) => l.startsWith('행동:')) && lines.some((l: string) => l.startsWith('수신 정보:'));
      if (isStandardFormat) return hasAction || hasInfo;
      return true;
    })
    .sort((a, b) => {
      const idxA = NIGHT_ORDER.indexOf(a.character as string);
      const idxB = NIGHT_ORDER.indexOf(b.character as string);
      const valA = idxA === -1 ? 99 : idxA;
      const valB = idxB === -1 ? 99 : idxB;
      return valA - valB;
    });
};

export const calculateMaxDays = (selectedHistory: GameHistory) => {
  let maxDays = Math.max(...Object.keys(selectedHistory.dayLogs || {}).map(Number), 1);
  
  const maxNights = Math.max(...selectedHistory.players.map(p => {
    if (!p.messageHistory) return 0;
    let realLen = p.messageHistory.length;
    while (realLen > 0 && !p.messageHistory[realLen - 1]) realLen--;
    return realLen;
  }), 1);
  
  if (maxNights > maxDays) maxDays = maxNights;
  
  while (maxDays > 1) {
    const hasDayLog = selectedHistory.dayLogs && selectedHistory.dayLogs[maxDays];
    const hasNightLog = selectedHistory.players.some(p => p.messageHistory && p.messageHistory[maxDays - 1]);
    if (!hasDayLog && !hasNightLog) {
      maxDays--;
    } else {
      break;
    }
  }
  return maxDays;
};

export const generateClipboardText = (selectedHistory: GameHistory): string => {
  let text = `[게임 기본 정보]\n일시: ${new Date(selectedHistory.timestamp).toLocaleString()}\n인원: ${selectedHistory.players.length}인 게임\n`;
  text += `결과: ${selectedHistory.winner === 'good' ? '선의 승리' : '악의 승리'} (${selectedHistory.winReason})\n\n`;
  
  if (selectedHistory.evilInfo) {
    text += `[초기 악마 정보]\n악마: ${selectedHistory.players.find(p => p.uid === selectedHistory.evilInfo?.demonUid)?.name || '알 수 없음'}\n`;
    const minionNames = selectedHistory.evilInfo.minionUids.map(u => selectedHistory.players.find(p => p.uid === u)?.name).join(', ');
    text += `하수인: ${minionNames || '없음'}\n`;
    text += `악마 블러프: ${selectedHistory.evilInfo.bluffs.map(b => getRoleName(b)).join(', ')}\n\n`;
  }

  text += `[참가자 명단]\n`;
  selectedHistory.players.forEach(p => {
    let roleText = getFormattedRole(p, selectedHistory.evilInfo);
    if (p.isRedHerring) roleText += ` (환각 대상)`;
    text += `- ${p.name}: ${roleText}\n`;
  });
  text += `\n`;

  const maxDays = calculateMaxDays(selectedHistory);
  
  for (let day = 1; day <= maxDays; day++) {
    text += `[${day}일차 밤]\n`;
    const nightIdx = day - 1;
    const nightPlayers = getSortedNightPlayers(selectedHistory.players, nightIdx);
    
    if (nightPlayers.length > 0) {
      nightPlayers.forEach(p => {
        let roleText = getFormattedRole(p, selectedHistory.evilInfo);
        if (p.isRedHerring) roleText += ` (환각 대상)`;
        text += `- ${p.name}(${roleText}):\n  ${formatNightMessage(p.messageHistory[nightIdx])}\n`;
      });
    } else {
      text += `- 기록 없음\n`;
    }
    text += `\n`;

    if (selectedHistory.dayLogs && selectedHistory.dayLogs[day]) {
      text += `[${day}일차 낮]\n`;
      const log = selectedHistory.dayLogs[day];
      
      if (log.aliveGood !== undefined && log.aliveEvil !== undefined) {
         text += `생존자 현황: 선 ${log.aliveGood}명 / 악 ${log.aliveEvil}명\n`;
      }

      if (log.nightDeaths && log.nightDeaths.length > 0) {
         const deathList = log.nightDeaths.map(name => {
            const p = selectedHistory.players.find(pl => pl.name === name);
            return p ? `${name}(${getRoleName(p.character)})` : name;
         }).join(', ');
         text += `밤 사이 사망자: ${deathList}\n`;
      }

      if (log.abilityLogs && log.abilityLogs.length > 0) {
         text += `능력 발동 내역:\n`;
         log.abilityLogs.forEach(aLog => {
            text += `  - ${aLog}\n`;
         });
      }

      if (log.nominations && log.nominations.length > 0) {
         text += `투표 내역:\n`;
         log.nominations.forEach(n => {
            text += `  - [${n.nominatorName} 지목] ${n.targetName} -> 찬성 ${n.yesCount}명 (${n.voterNames.join(', ')})\n`;
         });
      } else {
         text += `투표 내역: 없음\n`;
      }
      if (log.executedUid) {
         const execP = selectedHistory.players.find(p => p.uid === log.executedUid);
         text += `처형됨: ${execP?.name} (${getRoleName(execP?.character)})\n`;
      } else {
         text += `처형됨: 없음\n`;
      }
      text += `\n`;
    }
  }

  text += `[최종 결과]\n${selectedHistory.winner === 'good' ? '선의 승리' : '악의 승리'} (${selectedHistory.winReason})\n`;
  return text;
};