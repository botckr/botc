import type { Alignment, RoleType } from './character';

export type GamePhase = 'lobby' | 'setup' | 'night' | 'day' | 'voting' | 'end';

export interface PublicPlayer {
  uid: string;
  name: string;
  isDead: boolean;
  hasGhostVote: boolean;
  seatIndex: number;
}

export interface Nomination {
  targetUid: string;
  nominatorUid: string;
  yesVotes: number;
  noVotes: number;
  voters: Record<string, boolean>;
}

export interface NominationRecord {
  targetUid: string;
  targetName: string;
  nominatorName: string;
  yesCount: number;
  voterNames: string[];
  voterUids: string[];
}

export interface GameEvent {
  type: 'slayer_shot' | 'nomination' | 'execution';
  actorUid?: string;
  actorName: string;
  targetUid?: string;
  targetName: string;
  timestamp: number;
  status?: 'pending' | 'dead' | 'miss';
}

export interface PublicRoomState {
  status: GamePhase;
  players: Record<string, PublicPlayer>;
  dayNumber: number;
  nominations: Record<string, Nomination> | null;
  lastExecutedUid?: string | null; 
  highestVotes?: number; 
  executionTargetUid?: string | null; 
  events?: Record<string, GameEvent>;
  usedNominators?: string[]; 
  usedTargets?: string[];
  winner?: 'good' | 'evil' | null; 
  nominationHistory?: NominationRecord[]; // 오늘 진행된 투표 기록
}

export interface SecretPlayer {
  character: RoleType | null; 
  fakeCharacter?: RoleType | null; 
  alignment: Alignment | null;
  isDrunk: boolean;
  isPoisoned: boolean;
  bluffs: RoleType[]; 
  messageHistory?: string[];
  evilTeamInfo?: {
    demonName: string;
    minionNames: string[];
    bluffs: RoleType[];
  } | null;
  isUsed?: boolean; 
  isRedHerring?: boolean; 
  butlerMasterUid?: string | null;
}

export interface NightAction {
  targetUid: string | null;
  target2Uid: string | null;
  status: 'pending' | 'completed';
}

export interface NightResult {
  message: string;
}

export interface SecretRoomState {
  stUid: string;
  players: Record<string, SecretPlayer>;
  nightActions: Record<string, NightAction>;
  nightResults: Record<string, NightResult>;
  dayLogs?: Record<number, {
    nominations: NominationRecord[];
    executedUid: string | null;
  }>;
  evilInfo?: {
    demonUid: string;
    minionUids: string[];
    bluffs: RoleType[];
  } | null;
}

export interface GameHistory {
  id: string;
  timestamp: number;
  winner: 'good' | 'evil';
  players: {
    uid: string;
    name: string;
    character: RoleType | null;
    fakeCharacter?: RoleType | null;
    messageHistory: string[];
  }[];
  dayLogs: Record<number, {
    nominations: NominationRecord[];
    executedUid: string | null;
  }>;
}
