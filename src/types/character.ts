export type Alignment = 'good' | 'evil';

export type RoleType = 
  // Townsfolk (주민)
  | 'washerwoman' | 'librarian' | 'investigator' | 'chef' 
  | 'empath' | 'fortune_teller' | 'undertaker' | 'monk' 
  | 'ravenkeeper' | 'virgin' | 'slayer' | 'soldier' | 'mayor'
  // Outsiders (외부자)
  | 'butler' | 'drunk' | 'recluse' | 'saint'
  // Minions (하수인)
  | 'poisoner' | 'spy' | 'scarlet_woman' | 'baron'
  // Demons (악마)
  | 'imp' | 'dead_imp';

export interface CharacterDef {
  id: RoleType;
  name: string; // 한글 이름 (예: 세탁부)
  alignment: Alignment;
  type: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  abilityText: string;
}
