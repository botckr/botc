import type { PublicRoomState, SecretRoomState } from '../types/game';

/**
 * 악마가 사망했을 때 홍등가 여인(Scarlet Woman)이 계승할 수 있는지 체크하고 처리합니다.
 * @returns 계승 성공 여부
 */
export function handleDemonDeath(pub: PublicRoomState, sec: SecretRoomState, isStarpass: boolean = false, deadDemonUid: string): boolean {
  // 룰북: '악마가 죽기 직전' 생존자가 5명 이상일 때 홍등가 여인이 계승함
  // 이미 pub.players[targetUid].isDead = true 처리가 된 상태이므로, 
  // 방금 죽은 악마를 포함하여 생존자 수를 계산해야 합니다.
  // 이 함수가 호출되는 시점은 항상 악마가 막 죽은 직후입니다.
  const alivePlayersCount = Object.values(pub.players).filter(p => !p.isDead).length + 1;
  
  if (isStarpass) {
    // 스타패스: 생존자 수나 홍등가 여부와 상관없이 살아있는 하수인 중 한 명이 임프가 됨
    const aliveMinions = Object.entries(sec.players).filter(([uid, p]) => 
      ['poisoner', 'spy', 'scarlet_woman', 'baron'].includes(p.character || '') && !pub.players[uid]?.isDead
    );

    if (aliveMinions.length > 0) {
      // 홍등가 여인이 살아있다면 우선 계승, 아니면 무작위(첫번째) 하수인
      const sw = aliveMinions.find(([_, p]) => p.character === 'scarlet_woman');
      const successorUid = sw ? sw[0] : aliveMinions[0][0];
      
      sec.players[successorUid].character = 'imp';
      sec.players[deadDemonUid].character = 'dead_imp' as any; // 원래 임프는 죽은 임프로 처리하여 중복 방지
      return true; // 계승 성공
    }
  } else {
    // 일반 사망: 5인 이상일 때 홍등가 여인만 계승 가능
    if (alivePlayersCount >= 5) {
      const swEntry = Object.entries(sec.players).find(([uid, p]) => 
        p.character === 'scarlet_woman' && !pub.players[uid]?.isDead
      );

      if (swEntry) {
        const swUid = swEntry[0];
        sec.players[swUid].character = 'imp';
        sec.players[deadDemonUid].character = 'dead_imp' as any; // 원래 임프는 죽은 임프로 처리
        return true; // 계승 성공
      }
    }
  }
  
  return false; // 계승 실패 (게임 종료 대상)
}

/**
 * 현재 게임의 승리 조건을 판정합니다.
 */
export function checkWinCondition(pub: PublicRoomState, sec: SecretRoomState): { winner: 'good' | 'evil', reason: string } | null {
  const alivePlayers = Object.values(pub.players).filter(p => !p.isDead);
  const imp = Object.entries(sec.players).find(([uid, p]) => 
    p.character === 'imp' && !pub.players[uid]?.isDead
  );

  // 1. 선의 승리: 악마가 죽고 계승자도 없을 때
  if (!imp) {
    return { winner: 'good', reason: '악마(임프) 사망' };
  }

  // 2. 악의 승리: 생존자가 2명만 남았을 때 (악마 포함됨)
  if (alivePlayers.length <= 2) {
    return { winner: 'evil', reason: '생존자 2인(악마 포함) 도달' };
  }

  return null;
}
