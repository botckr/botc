import { create } from 'zustand';
import type { PublicRoomState, GamePhase } from '../types/game';

interface GameState {
  // 상태
  roomState: PublicRoomState | null;
  roomId: string | null;
  role: 'st' | 'player' | null;
  showSpyIntel: boolean;
  
  // 액션
  setRoomState: (state: PublicRoomState | null) => void;
  setRoomId: (id: string | null) => void;
  setRole: (role: 'st' | 'player' | null) => void;
  setShowSpyIntel: (show: boolean) => void;
  nominatePlayer: (targetUid: string, nominatorUid: string) => void;
  updatePhase: (newPhase: GamePhase) => void;
}

export const useGameStore = create<GameState>((set) => ({
  roomState: null,
  roomId: localStorage.getItem('botc_room_id'),
  role: localStorage.getItem('botc_role') as 'st' | 'player' | null,
  showSpyIntel: false,

  setRoomState: (state) => set({ roomState: state }),
  
  setRoomId: (id: string | null) => {
    if (id) localStorage.setItem('botc_room_id', id);
    else localStorage.removeItem('botc_room_id');
    set({ roomId: id });
  },

  setRole: (role) => {
    if (role) localStorage.setItem('botc_role', role);
    else localStorage.removeItem('botc_role');
    set({ role });
  },

  setShowSpyIntel: (show: boolean) => set({ showSpyIntel: show }),

  nominatePlayer: (targetUid, nominatorUid) => set((state) => {
    if (!state.roomState) return state;
    return {
      roomState: {
        ...state.roomState,
        status: 'voting',
        nominations: {
          [targetUid]: {
            targetUid,
            nominatorUid,
            yesVotes: 0,
            noVotes: 0,
            voters: {},
          }
        }
      }
    };
  }),

  updatePhase: (newPhase) => set((state) => {
    if (!state.roomState) return state;
    return {
      roomState: {
        ...state.roomState,
        status: newPhase,
      }
    };
  }),
}));
