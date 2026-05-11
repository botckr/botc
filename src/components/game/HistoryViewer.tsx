import { useState, useEffect } from 'react';
import { database } from '../../lib/firebase';
import { ref, get } from 'firebase/database';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import type { GameHistory } from '../../types/game';
import { cn } from '../../lib/utils/cn';

export function HistoryViewer({ onClose }: { onClose: () => void }) {
  const [histories, setHistories] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<GameHistory | null>(null);

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const snapshot = await get(ref(database, 'history'));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const parsed = Object.values(data) as GameHistory[];
          parsed.sort((a, b) => b.timestamp - a.timestamp);
          setHistories(parsed);
        }
      } catch (e) {
        console.error("Failed to fetch histories:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistories();
  }, []);

  if (selectedHistory) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl animate-fade-in bg-slate-900 p-6 rounded-3xl border border-slate-700 h-[80vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-xl font-black text-sky-400">게임 세부 기록</h2>
          <Button variant="ghost" size="sm" onClick={() => setSelectedHistory(null)} className="text-slate-400 hover:text-white">뒤로가기</Button>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-400">일시: {new Date(selectedHistory.timestamp).toLocaleString()}</p>
          <p className="text-xl font-black">
            승리 진영: <span className={selectedHistory.winner === 'good' ? 'text-sky-400' : 'text-rose-500'}>{selectedHistory.winner === 'good' ? '선의 승리' : '악의 승리'}</span>
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">플레이어 정보</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
             {selectedHistory.players.map(p => (
               <div key={p.uid} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                 <span className="font-bold text-slate-200 text-sm">{p.name}</span>
                 <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                    {getRoleName(p.character)}
                    {p.fakeCharacter && <span className="text-amber-500 ml-1">({getRoleName(p.fakeCharacter)})</span>}
                 </span>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">일차별 기록</h3>
          {selectedHistory.dayLogs && Object.entries(selectedHistory.dayLogs).map(([dayStr, log]) => {
             const dayNum = parseInt(dayStr, 10);
             return (
               <div key={dayNum} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                 <h4 className="text-lg font-black text-sky-400 border-b border-slate-800 pb-2">{dayNum}일차 낮</h4>
                 
                 <div>
                    <h5 className="text-xs font-black text-slate-500 mb-2">투표 내역</h5>
                    {log.nominations && log.nominations.length > 0 ? (
                       <ul className="space-y-2">
                         {log.nominations.map((n, idx) => (
                           <li key={idx} className="text-sm text-slate-300">
                             <span className="text-slate-500">[{n.nominatorName} 지목]</span> <strong className="text-white">{n.targetName}</strong> 
                             <span className="ml-2 text-sky-400">찬성 {n.yesCount}명</span>
                             <span className="text-xs text-slate-600 block italic mt-1">({n.voterNames.join(', ')})</span>
                           </li>
                         ))}
                       </ul>
                    ) : (
                       <p className="text-xs text-slate-600">투표 없음</p>
                    )}
                 </div>

                 {log.executedUid && (
                    <div className="bg-rose-950/30 border border-rose-500/20 p-3 rounded-xl text-sm">
                       <span className="text-rose-500 font-black">처형됨:</span> {selectedHistory.players.find(p => p.uid === log.executedUid)?.name}
                    </div>
                 )}
               </div>
             );
          })}
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">개인별 밤 수신 정보 로그</h3>
          <div className="space-y-3">
             {selectedHistory.players.filter(p => p.messageHistory && p.messageHistory.length > 0).map(p => (
               <div key={p.uid} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                 <span className="font-bold text-slate-200 text-sm block mb-2">{p.name} ({getRoleName(p.character)})</span>
                 <ul className="space-y-2">
                    {p.messageHistory.map((msg, idx) => (
                       <li key={idx} className="text-xs text-slate-400 bg-slate-900 p-2 rounded whitespace-pre-wrap">{msg}</li>
                    ))}
                 </ul>
               </div>
             ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl animate-fade-in bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl h-[70vh] relative">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
        <h2 className="text-xl font-bold text-slate-200">과거 기록 열람</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">닫기</Button>
      </div>

      {loading ? (
         <div className="flex justify-center items-center h-full">
            <p className="text-slate-500 animate-pulse">기록을 불러오는 중...</p>
         </div>
      ) : histories.length === 0 ? (
         <div className="flex justify-center items-center h-full">
            <p className="text-slate-500">저장된 기록이 없습니다.</p>
         </div>
      ) : (
         <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 h-full">
            {histories.map(h => (
               <div 
                 key={h.id} 
                 onClick={() => setSelectedHistory(h)}
                 className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-colors group flex justify-between items-center"
               >
                 <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{new Date(h.timestamp).toLocaleString()}</span>
                    <span className="text-sm font-black text-slate-300">총 {h.players.length}인 게임</span>
                 </div>
                 <div className={cn("px-3 py-1 rounded-full text-xs font-black uppercase", h.winner === 'good' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-500')}>
                    {h.winner === 'good' ? '선의 승리' : '악의 승리'}
                 </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
}
