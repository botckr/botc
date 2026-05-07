import { memo, useState, useEffect } from 'react';
import { getRoleName, getRoleDescription } from '../../../constants/roles';
import type { RoleType, Alignment } from '../../../types/character';

interface PlayerIdentityProps {
  character: RoleType | null;
  fakeCharacter?: RoleType | null;
  alignment: Alignment | null;
  evilTeamInfo?: {
    demonName: string;
    minionNames: string[];
    bluffs: RoleType[];
  } | null;
  defaultOpen?: boolean;
  playerName?: string;
}

export const PlayerIdentity = memo(({ 
  character, 
  fakeCharacter, 
  alignment, 
  evilTeamInfo,
  defaultOpen = false,
  playerName
}: PlayerIdentityProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const currentRoleName = getRoleName(fakeCharacter || character);
  const currentRoleDesc = getRoleDescription(fakeCharacter || character);

  return (
    <div className="bg-slate-900/80 rounded-[2.5rem] border border-slate-800 backdrop-blur shadow-2xl overflow-hidden w-full transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        aria-expanded={isOpen}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-slate-800/50 transition-all group focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
      >
        <div className="flex items-center gap-4 sm:gap-5">
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl sm:text-2xl shadow-inner group-hover:scale-110 transition-transform" aria-hidden="true">🎭</div>
           <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 block mb-1">비밀 정보관</span>
              <span className="text-base sm:text-lg font-black text-slate-200 tracking-tight uppercase font-serif">나의 정체 확인</span>
           </div>
        </div>
        <span 
          className={`text-slate-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>

      {isOpen && (
        <div className="p-6 sm:p-8 pt-0 space-y-6 sm:space-y-8 animate-fade-in border-t border-slate-800/50 mt-2 bg-slate-950/40">
           <div className="py-6 px-6 sm:px-8 bg-slate-950/80 rounded-[1.5rem] border border-slate-800 shadow-inner mt-4 sm:mt-6 text-center space-y-3">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">현재 나의 정체</p>
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-100 to-sky-400 uppercase tracking-tighter italic">{currentRoleName}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-relaxed break-keep-all">{currentRoleDesc}</p>
           </div>

           {alignment === 'evil' && evilTeamInfo && (
              <div className="p-5 sm:p-6 bg-rose-950/20 border border-rose-500/20 rounded-[1.5rem] space-y-5 sm:space-y-6 shadow-xl text-center">
                 <p className="text-[10px] sm:text-[11px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/10 pb-2 sm:pb-3">비밀 작전 브리핑</p>
                 <div className="grid grid-cols-1 gap-5 sm:gap-6">
                    <div>
                      <span className="block text-[9px] sm:text-[10px] text-slate-500 font-black uppercase mb-1">악마(Demon)</span>
                      <span className="text-lg sm:text-xl text-rose-400 font-black uppercase tracking-tight italic underline decoration-rose-500/20">{evilTeamInfo.demonName}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] sm:text-[10px] text-slate-500 font-black uppercase mb-1">하수인(Minions)</span>
                      <span className="text-sm sm:text-base text-white font-bold leading-tight uppercase tracking-tight">{evilTeamInfo.minionNames.join(', ')}</span>
                    </div>
                    {evilTeamInfo.bluffs.length > 0 && character === 'imp' && playerName === evilTeamInfo.demonName && (
                       <div className="pt-3 sm:pt-4 border-t border-rose-500/10">
                          <span className="block text-[9px] sm:text-[10px] text-slate-500 font-black uppercase mb-2 sm:mb-3 tracking-widest">악마 블러프</span>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                            {evilTeamInfo.bluffs.map(b => (
                              <span key={b} className="bg-sky-500/10 text-sky-400 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-sky-500/20 text-[10px] sm:text-xs font-black uppercase shadow-sm">
                                {getRoleName(b)}
                              </span>
                            ))}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           )}
        </div>
      )}
    </div>
  );
});

PlayerIdentity.displayName = 'PlayerIdentity';
