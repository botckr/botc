import type { RoleType, Alignment } from '../types/character';

export const TROUBLE_BREWING_ROLES: { id: RoleType; name: string; align: Alignment; type: string; description: string }[] = [
  { id: 'washerwoman', name: '세탁부', align: 'good', type: 'townsfolk', description: '첫날 밤, 특정 주민 직업을 가진 플레이어와 다른 한 명을 알게 됩니다.' },
  { id: 'librarian', name: '사서', align: 'good', type: 'townsfolk', description: '첫날 밤, 특정 외부인 직업을 가진 플레이어와 다른 한 명을 알게 됩니다.' },
  { id: 'investigator', name: '조사관', align: 'good', type: 'townsfolk', description: '첫날 밤, 특정 하수인 직업을 가진 플레이어와 다른 한 명을 알게 됩니다.' },
  { id: 'chef', name: '요리사', align: 'good', type: 'townsfolk', description: '첫날 밤, 악의 진영 플레이어가 서로 인접해 있는 쌍의 수를 알게 됩니다.' },
  { id: 'empath', name: '공감자', align: 'good', type: 'townsfolk', description: '매일 밤, 살아있는 양옆의 플레이어 중 악의 진영이 몇 명인지 알 수 있습니다.' },
  { id: 'fortune_teller', name: '점쟁이', align: 'good', type: 'townsfolk', description: '매일 밤 2명을 선택해 그 중 악마가 있는지 봅니다. (한 명의 선의 진영은 악마로 판정되는 환각이 있습니다.)' },
  { id: 'undertaker', name: '장의사', align: 'good', type: 'townsfolk', description: '매일 밤, 그날 낮에 처형된 사람의 진짜 직업을 알게 됩니다.' },
  { id: 'monk', name: '수도승', align: 'good', type: 'townsfolk', description: '매일 밤, 다른 사람 1명을 선택해 악마의 공격으로부터 보호합니다.' },
  { id: 'ravenkeeper', name: '레이븐키퍼', align: 'good', type: 'townsfolk', description: '밤에 악마에게 죽임을 당하면, 플레이어 1명을 선택해 그 사람의 진짜 직업을 알 수 있습니다.' },
  { id: 'virgin', name: '처녀', align: 'good', type: 'townsfolk', description: '처음으로 당신을 지목한 사람이 마을 주민이라면, 그 지목자가 즉시 처형됩니다.' },
  { id: 'slayer', name: '슬레이어', align: 'good', type: 'townsfolk', description: '게임 중 단 한 번 낮에 플레이어 1명을 선택해, 그가 악마라면 죽일 수 있습니다.' },
  { id: 'soldier', name: '군인', align: 'good', type: 'townsfolk', description: '악마의 공격으로부터 안전합니다.' },
  { id: 'mayor', name: '시장', align: 'good', type: 'townsfolk', description: '당신이 죽어야 할 때 다른 누군가가 대신 죽을 수 있습니다. 생존자가 단 3명일 때 처형이 없으면 선의 승리입니다.' },
  { id: 'butler', name: '집사', align: 'good', type: 'outsider', description: '매일 밤 주인을 선택합니다. 다음 날 낮에는 주인이 투표할 때만 투표할 수 있습니다.' },
  { id: 'drunk', name: '주정뱅이', align: 'good', type: 'outsider', description: '자신이 선의 진영 특정 직업이라고 생각하지만, 사실은 주정뱅이입니다. 능력이 오작동합니다.' },
  { id: 'recluse', name: '은둔자', align: 'good', type: 'outsider', description: '선의 진영이지만, 조사 능력을 받을 때 악의 진영으로 판정될 수 있습니다.' },
  { id: 'saint', name: '성자', align: 'good', type: 'outsider', description: '당신이 낮에 처형되면 선의 진영이 패배합니다. (악의 진영 승리)' },
  { id: 'poisoner', name: '독술사', align: 'evil', type: 'minion', description: '매일 밤 1명을 선택해 그 밤과 다음 날 낮 동안 중독시킵니다. 중독된 플레이어는 능력이 오작동합니다.' },
  { id: 'spy', name: '스파이', align: 'evil', type: 'minion', description: '매일 밤 스토리텔러의 마도서를 볼 수 있습니다. 선의 진영으로 판정될 수 있습니다.' },
  { id: 'scarlet_woman', name: '핏빛 후계자', align: 'evil', type: 'minion', description: '악마가 죽을 때 생존자가 5명 이상이라면, 당신이 새로운 악마가 됩니다.' },
  { id: 'baron', name: '남작', align: 'evil', type: 'minion', description: '초기 세팅 시 게임에 외부인이 2명 추가됩니다.' },
  { id: 'imp', name: '임프', align: 'evil', type: 'demon', description: '매일 밤 1명을 선택해 죽입니다. 자신을 선택해 죽고 하수인에게 악마를 넘겨줄 수 있습니다.' },
];

export const getRoleName = (id?: RoleType | string | null) => {
  if (!id) return '?';
  if (id === 'dead_imp') return '임프(사망)';
  return TROUBLE_BREWING_ROLES.find(r => r.id === id)?.name || id;
};

export const getRoleDescription = (id?: RoleType | string | null) => {
  if (!id) return '';
  if (id === 'dead_imp') return '이전 악마입니다. 하수인에게 악마를 물려주었습니다.';
  return TROUBLE_BREWING_ROLES.find(r => r.id === id)?.description || '';
};
