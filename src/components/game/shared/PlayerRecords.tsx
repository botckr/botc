import { memo, useState, useEffect } from 'react';

interface PlayerRecordsProps {
  messageHistory?: string[];
  defaultOpen?: boolean;
}

export const PlayerRecords = memo(({
  messageHistory,
  defaultOpen = false
}: PlayerRecordsProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="bg-slate-900/80 rounded-[2.5rem] border border-slate-800 backdrop-blur shadow-2xl overflow-hidden w-full transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        aria-expanded={isOpen}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-slate-800/50 transition-all group focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
      >
        <div className="flex items-center gap-4 sm:gap-5">
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl sm:text-2xl shadow-inner group-hover:scale-110 transition-transform" aria-hidden="true">📜</div>
           <div className="text-left">
              <span className="text-base sm:text-lg font-black text-slate-200 tracking-tight uppercase font-serif">기록 아카이브</span>
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
        <div className="p-6 sm:p-8 pt-0 space-y-4 animate-fade-in border-t border-slate-800/50 mt-2 bg-slate-950/40">
           <div className="space-y-3 mt-4 sm:mt-6 pr-2">
              {messageHistory && messageHistory.length > 0 ? (
                 messageHistory.map((msg, i) => (
                   <div key={i} className="p-4 sm:p-5 bg-slate-900/80 rounded-[1.25rem] border border-slate-800 shadow-lg text-sm sm:text-base text-slate-300 italic font-serif leading-relaxed relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                         <span className="text-xs sm:text-xs font-black text-indigo-400/60 uppercase tracking-[0.2em]">기록 #{i + 1}</span>
                         <span className="text-xs font-bold text-slate-700 font-mono text-xs uppercase">밤 {i + 1}</span>
                      </div>
                      <div className="pl-1 sm:pl-2 space-y-1">
                         {msg.split('\n').filter(line => !line.trim().endsWith('없음')).length > 0 ? (
                           msg.split('\n').filter(line => !line.trim().endsWith('없음')).map((line, j) => (
                             <p key={j}>{line}</p>
                           ))
                         ) : (
                           <p className="text-slate-500 italic">특이사항 없음</p>
                         )}
                      </div>
                   </div>
                 ))
              ) : (
                 <div className="py-10 sm:py-12 px-6 text-center border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-950/20 shadow-inner">
                   <p className="text-slate-700 font-black uppercase tracking-widest text-xs sm:text-xs font-serif">복구된 기록이 없습니다.</p>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
});

PlayerRecords.displayName = 'PlayerRecords';
