interface NominationHistoryProps {
  nominationHistory: any[] | undefined;
  majorityNeeded: number;
}

export function NominationHistory({ nominationHistory, majorityNeeded }: NominationHistoryProps) {
  return (
    <div className="space-y-4">
       {nominationHistory && nominationHistory.length > 0 ? (
          nominationHistory.map((record, i) => (
            <div key={i} className="bg-slate-950/50 p-4 rounded-[1.5rem] border border-slate-800/50 animate-fade-in shadow-inner">
               <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                     <span className="text-xs text-slate-600 font-black uppercase tracking-widest">지목자</span>
                     <span className="text-sm font-bold text-slate-400">{record.nominatorName}</span>
                  </div>
                  <div className="text-sky-500 text-xs mt-2 animate-pulse" aria-hidden="true">▶</div>
                  <div className="flex flex-col text-right">
                     <span className="text-xs text-slate-600 font-black uppercase tracking-widest">대상</span>
                     <span className="text-sm font-bold text-sky-400">{record.targetName}</span>
                  </div>
               </div>
               <div className="pt-3 border-t border-slate-900/50 flex justify-between items-center overflow-hidden">
                  <div className="flex flex-col flex-1 min-w-0 pr-4">
                     <span className="text-xs text-slate-600 font-black uppercase mb-1 whitespace-nowrap">찬성 수 ({record.yesCount})</span>
                     <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                        <p className="text-xs text-slate-400 italic whitespace-nowrap">{(record.voterNames || []).join(', ') || '없음'}</p>
                     </div>
                  </div>
                  {record.yesCount >= majorityNeeded && (
                     <span className="text-[10px] sm:text-xs bg-rose-900/30 text-rose-500 border border-rose-900/50 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap flex-shrink-0">처형 위기</span>
                  )}
               </div>
            </div>
          ))
       ) : (
          <p className="text-xs text-slate-600 italic text-center py-10 font-black uppercase tracking-widest opacity-50">오늘은 진행된 투표가 없습니다.</p>
       )}
    </div>
  );
}
