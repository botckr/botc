import type { RoleType, Alignment } from '../types/character';

export const TROUBLE_BREWING_ROLES: { id: RoleType; name: string; align: Alignment; type: string; description: string }[] = [
  { id: 'washerwoman', name: '세탁부', align: 'good', type: 'townsfolk', description: '첫날 밤, 특정 주민 직업을 가진 플레이어와 다른 한 명을 알게 됩니다. 얻은 정보를 공개하여 해당 플레이어들과 초기 연대를 구축하고 정보 교환의 기반으로 삼습니다. 스파이가 마을 주민으로 거짓 등록될 가능성이 있으므로 맹신은 금물입니다.' },
  { id: 'librarian', name: '사서', align: 'good', type: 'townsfolk', description: '첫날 밤, 특정 외부인 직업을 가진 플레이어와 다른 한 명을 알게 됩니다. 주정뱅이의 위치를 파악하여 그가 제공하는 잘못된 정보를 논리에서 배제하는 데 활용합니다. 확인된 외부인의 수를 통해 남작의 개입 여부를 역산출합니다.' },
  { id: 'investigator', name: '조사관', align: 'good', type: 'townsfolk', description: '첫날 밤, 특정 하수인 직업을 가진 플레이어와 다른 한 명을 알게 됩니다. 확보한 정보를 즉시 공개하여 지목된 두 플레이어를 압박하고 투표 패턴을 감시합니다. 은둔자가 하수인으로 등록되었을 가능성을 염두에 두고 교차 검증을 수행합니다.' },
  { id: 'chef', name: '요리사', align: 'good', type: 'townsfolk', description: '첫날 밤, 악의 진영 플레이어가 서로 인접해 있는 쌍의 수를 알게 됩니다. 초반에 정보를 공유하여 전체적인 악의 배치 구도를 마을에 제공합니다. 은둔자나 스파이의 존재로 인해 결과값이 왜곡될 수 있음을 고려해야 합니다.' },
  { id: 'empath', name: '공감자', align: 'good', type: 'townsfolk', description: '매일 밤, 살아있는 양옆의 플레이어 중 악의 진영이 몇 명인지 알 수 있습니다. 이웃이 처형되거나 살해당하면 그 너머의 플레이어를 새롭게 감지하므로 점진적 타겟팅이 가능합니다. 강력한 정보원이므로 수도승 등의 보호를 유도하여 생존 기간을 늘려야 합니다.' },
  { id: 'fortune_teller', name: '점쟁이', align: 'good', type: 'townsfolk', description: '매일 밤 2명을 선택해 그 중 악마가 있는지 봅니다. 단, 한 명의 선의 진영은 악마로 판정되는 환각이 있습니다. 임프의 표적이 되지 않도록 자신의 실제 캐릭터를 숨기고 거짓 블러핑을 전개하는 것이 유리합니다. 사망한 플레이어나 본인 스스로를 타겟에 포함해 용의 선상을 좁힙니다.' },
  { id: 'undertaker', name: '장의사', align: 'good', type: 'townsfolk', description: '매일 밤, 그날 낮에 처형된 사람의 진짜 직업을 알게 됩니다. 안전한 검증을 위해 본인의 정체를 숨기고 다른 정보 캐릭터로 위장합니다. 정보가 불확실한 선한 플레이어를 의도적으로 처형시켜 진위 여부를 판별합니다.' },
  { id: 'monk', name: '수도승', align: 'good', type: 'townsfolk', description: '매일 밤, 다른 사람 1명을 선택해 악마의 공격으로부터 보호합니다. 공감자나 점쟁이처럼 지속적인 정보 수집이 필수적인 캐릭터를 최우선으로 보호합니다. 악마의 살해 패턴을 예측하여 타겟을 선제 방어해야 합니다.' },
  { id: 'ravenkeeper', name: '레이븐키퍼', align: 'good', type: 'townsfolk', description: '밤에 악마에게 죽임을 당하면, 플레이어 1명을 선택해 그 사람의 진짜 직업을 알 수 있습니다. 자신이 강력한 정보 캐릭터인 것처럼 거짓말을 하여 임프의 공격을 유도하는 미끼 역할을 합니다. 사망 시 발동하는 능력을 활용해 가장 의심스러운 플레이어의 정체를 폭로합니다.' },
  { id: 'virgin', name: '처녀', align: 'good', type: 'townsfolk', description: '처음으로 당신을 지목한 사람이 마을 주민이라면, 그 지목자가 즉시 처형됩니다. 의심받는 선한 플레이어에게 지명을 요청하여, 생명을 희생함으로써 두 사람 모두 확실한 마을 주민임을 입증합니다. 처형이 발동하지 않을 경우 지명자가 외부인, 하수인, 악마 중 하나임을 확정 지을 수 있습니다.' },
  { id: 'slayer', name: '슬레이어', align: 'good', type: 'townsfolk', description: '게임 중 단 한 번 낮에 플레이어 1명을 선택해, 그가 악마라면 죽일 수 있습니다. 확실한 단서가 모일 때까지 능력을 아끼거나, 용의자를 압박하기 위해 과감하게 악마를 지목합니다. 자신이 슬레이어가 아님에도 능력 사용을 선언하는 척 블러핑하여 다른 플레이어들의 반응을 분석할 수 있습니다.' },
  { id: 'soldier', name: '군인', align: 'good', type: 'townsfolk', description: '악마의 공격으로부터 안전합니다. 가치 있는 캐릭터로 거짓 위장하여 악마가 밤 공격을 본인에게 낭비하도록 유도합니다. 임프가 군인으로 위장하는 경우가 잦으므로, 본인이 진짜 군인임을 입증할 논리적 알리바이를 준비해야 합니다.' },
  { id: 'mayor', name: '시장', align: 'good', type: 'townsfolk', description: '당신이 죽어야 할 때 다른 누군가가 대신 죽을 수 있습니다. 생존자가 단 3명일 때 처형이 없으면 선의 승리입니다. 평화주의 승리 조건을 달성하기 위해 마지막 날까지 끈질기게 생존하는 것이 최우선 목표입니다. 초반에 자신이 시장임을 입증하기 위해 스스로 죽음을 택해 악의 승리 가능성을 낮추는 희생을 고려할 수도 있습니다.' },
  { id: 'butler', name: '집사', align: 'good', type: 'outsider', description: '매일 밤 주인을 선택합니다. 다음 날 낮에는 주인이 투표할 때만 투표할 수 있습니다. 신뢰할 수 있는 명백한 선한 플레이어를 주인으로 지정하여 자신의 투표권을 안정적으로 확보합니다. 투표권 상실로 인한 방해를 최소화하기 위해 논리 전개 시 본인의 투표 제약을 명확히 밝힙니다.' },
  { id: 'drunk', name: '주정뱅이', align: 'good', type: 'outsider', description: '자신이 선의 진영 특정 직업이라고 생각하지만, 사실은 주정뱅이입니다. 능력이 오작동합니다. 사서의 정보를 통해 주정뱅이의 존재가 확인되면, 가장 모순된 정보를 제공하는 자신의 데이터를 스스로 폐기해야 합니다. 자신이 진실이라고 믿는 정보가 사실은 악의 기만일 수 있음을 항상 의심해야 합니다.' },
  { id: 'recluse', name: '은둔자', align: 'good', type: 'outsider', description: '선의 진영이지만, 조사 능력을 받을 때 악의 진영으로 판정될 수 있습니다. 일찍 정체를 밝혀 요리사나 공감자의 정보 왜곡을 설명하고 마을의 혼란을 조기에 방지합니다. 슬레이어의 타겟이 되거나 처형당하지 않도록 논리적으로 자신의 선함을 변호해야 합니다.' },
  { id: 'saint', name: '성자', align: 'good', type: 'outsider', description: '당신이 낮에 처형되면 선의 진영이 패배합니다. (악의 진영 승리) 처형 위기에 직면하면 즉시 정체를 밝혀 게임이 강제 종료되는 것을 막아야 합니다. 악한 팀이 의도적으로 처형을 유도할 수 있으므로, 거짓 정보에 맞서 방어적인 입장을 유지해야 합니다.' },
  { id: 'poisoner', name: '독술사', align: 'evil', type: 'minion', description: '매일 밤 1명을 선택해 그 밤과 다음 날 낮 동안 중독시킵니다. 중독된 플레이어는 능력이 오작동합니다. 점쟁이나 공감자 등 치명적인 정보력을 가진 캐릭터를 집요하게 중독시켜 수사망을 교란합니다. 평범한 선한 플레이어로 위장하여 의심을 피하는 동시에, 허위 정보를 생산해 진실을 덮습니다.' },
  { id: 'spy', name: '스파이', align: 'evil', type: 'minion', description: '매일 밤 스토리텔러의 마도서를 볼 수 있습니다. 선의 진영으로 판정될 수 있습니다. 파악한 마도서 정보를 바탕으로 가장 그럴듯한 거짓말을 설계하여 선한 팀에 큰 혼란을 야기합니다. 마을 주민으로 등록되는 특성을 악용해 처녀의 함정을 역이용하는 등 완전한 선으로 위장합니다.' },
  { id: 'scarlet_woman', name: '핏빛 후계자', align: 'evil', type: 'minion', description: '악마가 죽을 때 생존자가 5명 이상이라면, 당신이 새로운 악마가 됩니다. 임프가 추적당해 처형될 상황을 대비하여, 팀의 패배를 막기 위해 조용히 생존에 주력합니다. 임프와 합의하에 임프가 자살하게 만들어, 이미 선방이 입증된 본인에게 악마 역할을 안전하게 인계합니다.' },
  { id: 'baron', name: '남작', align: 'evil', type: 'minion', description: '초기 세팅 시 게임에 외부인이 2명 추가됩니다. 마을 주민의 능력 풀이 줄어든 것을 틈타 본인이 외부인인 척 블러핑하여 수를 꼬이게 만듭니다. 필요할 경우 팀의 신뢰도를 높이기 위해 본인이 고의로 처형당하는 버림패 역할을 자처할 수 있습니다.' },
  { id: 'imp', name: '임프', align: 'evil', type: 'demon', description: '매일 밤 1명을 선택해 죽입니다. 자신을 선택해 죽고 하수인에게 악마를 넘겨줄 수 있습니다. 군인이나 시장처럼 방어력이 있거나 증명 불가능한 역할로 강력하게 블러핑하여 추적을 피합니다. 수사망이 좁혀오면 밤에 자살을 강행하여, 용의 선상에서 벗어난 하수인에게 임프의 자리를 넘겨주어 수사를 원점으로 되돌립니다. 선한 팀이 논리를 세우지 못하도록 지속적으로 거짓 정보를 유포하고 신분을 철저히 세탁합니다.' },
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
