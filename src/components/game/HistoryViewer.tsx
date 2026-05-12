import { useState, useEffect } from 'react';
import { database } from '../../lib/firebase';
import { ref, get } from 'firebase/database';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import type { GameHistory } from '../../types/game';
import { cn } from '../../lib/utils/cn';

const NIGHT_ORDER = [
  'poisoner', 'monk', 'scarlet_woman', 'imp', 'ravenkeeper', 
  'washerwoman', 'librarian', 'investigator', 'chef', 
  'undertaker', 'empath', 'fortune_teller', 'butler', 'spy'
];

export function HistoryViewer({ onClose }: { onClose: () => void }) {
  const [histories, setHistories] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<GameHistory | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopyText = async () => {
    if (!selectedHistory) return;
    
    let text = `[게임 기본 정보]\n일시: ${new Date(selectedHistory.timestamp).toLocaleString()}\n인원: ${selectedHistory.players.length}인 게임\n`;
    text += `결과: ${selectedHistory.winner === 'good' ? '선의 승리' : '악의 승리'} (${selectedHistory.winReason})\n\n`;
    
    if (selectedHistory.evilInfo) {
       text += `[초기 악마 정보]\n악마: ${selectedHistory.players.find(p => p.uid === selectedHistory.evilInfo?.demonUid)?.name || '알 수 없음'}\n`;
       const minionNames = selectedHistory.evilInfo.minionUids.map(u => selectedHistory.players.find(p => p.uid === u)?.name).join(', ');
       text += `하수인: ${minionNames || '없음'}\n`;
       text += `악마 블러프: ${selectedHistory.evilInfo.bluffs.map(b => getRoleName(b)).join(', ')}\n\n`;
    }

    text += `[참가자 명단]\n`;
    selectedHistory.players.forEach(p => {
       let roleText = getRoleName(p.character);
       if (p.fakeCharacter) roleText += ` (가짜: ${getRoleName(p.fakeCharacter)})`;
       text += `- ${p.name}: ${roleText}\n`;
    });
    text += `\n`;

    let maxDays = Math.max(...Object.keys(selectedHistory.dayLogs || {}).map(Number), 1);
    
    // messageHistory 길이를 통해 실제 진행된 밤의 횟수를 파악하여 maxDays 보정
    const maxNights = Math.max(...selectedHistory.players.map(p => p.messageHistory?.length || 0), 1);
    if (maxNights > maxDays) maxDays = maxNights;
    
    const getSortedNightPlayers = (nightIdx: number) => {
       return [...selectedHistory.players]
          .filter(p => {
             const msg = p.messageHistory?.[nightIdx];
             if (!msg) return false;
             // 행동과 수신 정보가 모두 '없음'이면 제외
             const lines = msg.split('\n').map(l => l.trim());
             const hasAction = lines.some(l => l.startsWith('행동:') && !l.includes('없음'));
             const hasInfo = lines.some(l => l.startsWith('수신 정보:') && !l.includes('없음'));
             // 만약 특수한 시스템 메시지라면 포함 (행동/수신정보 포맷이 아닌 경우)
             const isStandardFormat = lines.some(l => l.startsWith('행동:')) && lines.some(l => l.startsWith('수신 정보:'));
             
             if (isStandardFormat) {
                return hasAction || hasInfo;
             }
             return true;
          })
          .sort((a, b) => {
             const idxA = NIGHT_ORDER.indexOf(a.character as string);
             const idxB = NIGHT_ORDER.indexOf(b.character as string);
             const valA = idxA === -1 ? 99 : idxA;
             const valB = idxB === -1 ? 99 : idxB;
             return valA - valB;
          });
    };

    const formatNightMessage = (msg: string) => {
       const lines = msg.split('\n').map(l => l.trim());
       return lines.filter(l => !l.endsWith('없음')).join('\n  ');
    };

    for (let day = 1; day <= maxDays; day++) {
       text += `[${day}일차 밤]\n`;
       const nightIdx = day - 1;
       const nightPlayers = getSortedNightPlayers(nightIdx);
       
       if (nightPlayers.length > 0) {
          nightPlayers.forEach(p => {
             let roleText = getRoleName(p.character);
             if (p.fakeCharacter) roleText = `주정뱅이(착각: ${getRoleName(p.fakeCharacter)})`;
             text += `- ${p.name}(${roleText}):\n  ${formatNightMessage(p.messageHistory[nightIdx])}\n`;
          });
       } else {
          text += `- 기록 없음\n`;
       }
       text += `\n`;

       if (selectedHistory.dayLogs && selectedHistory.dayLogs[day]) {
          text += `[${day}일차 낮]\n`;
          const log = selectedHistory.dayLogs[day];
          
          if (log.abilityLogs && log.abilityLogs.length > 0) {
             text += `능력 발동 내역:\n`;
             log.abilityLogs.forEach(aLog => {
                text += `  - ${aLog}\n`;
             });
          }

          if (log.nominations && log.nominations.length > 0) {
             text += `투표 내역:\n`;
             log.nominations.forEach(n => {
                text += `  - [${n.nominatorName} 지목] ${n.targetName} -> 찬성 ${n.yesCount}명 (${n.voterNames.join(', ')})\n`;
             });
          } else {
             text += `투표 내역: 없음\n`;
          }
          if (log.executedUid) {
             text += `처형됨: ${selectedHistory.players.find(p => p.uid === log.executedUid)?.name}\n`;
          } else {
             text += `처형됨: 없음\n`;
          }
          text += `\n`;
       }
    }

    text += `[최종 결과]\n${selectedHistory.winner === 'good' ? '선의 승리' : '악의 승리'} (${selectedHistory.winReason})\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  if (selectedHistory) {
    let maxDays = Math.max(...Object.keys(selectedHistory.dayLogs || {}).map(Number), 1);
    const maxNights = Math.max(...selectedHistory.players.map(p => p.messageHistory?.length || 0), 1);
    if (maxNights > maxDays) maxDays = maxNights;
    const dayArray = Array.from({length: maxDays}, (_, i) => i + 1);

    const getSortedNightPlayers = (nightIdx: number) => {
       return [...selectedHistory.players]
          .filter(p => {
             const msg = p.messageHistory?.[nightIdx];
             if (!msg) return false;
             const lines = msg.split('\n').map(l => l.trim());
             const hasAction = lines.some(l => l.startsWith('행동:') && !l.includes('없음'));
             const hasInfo = lines.some(l => l.startsWith('수신 정보:') && !l.includes('없음'));
             const isStandardFormat = lines.some(l => l.startsWith('행동:')) && lines.some(l => l.startsWith('수신 정보:'));
             if (isStandardFormat) return hasAction || hasInfo;
             return true;
          })
          .sort((a, b) => {
             const idxA = NIGHT_ORDER.indexOf(a.character as string);
             const idxB = NIGHT_ORDER.indexOf(b.character as string);
             const valA = idxA === -1 ? 99 : idxA;
             const valB = idxB === -1 ? 99 : idxB;
             return valA - valB;
          });
    };

    const formatNightMessage = (msg: string) => {
       const lines = msg.split('\n').map(l => l.trim());
       return lines.filter(l => !l.endsWith('없음')).join('\n  ');
    };

    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl animate-fade-in bg-slate-900 p-6 rounded-3xl border border-slate-700 h-[80vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-xl font-black text-sky-400">게임 세부 기록</h2>
          <div className="flex gap-2">
             <Button variant="secondary" size="sm" onClick={handleCopyText} className="text-xs uppercase font-black">
               {copied ? '복사 완료!' : '텍스트 복사'}
             </Button>
             <Button variant="ghost" size="sm" onClick={() => setSelectedHistory(null)} className="text-slate-400 hover:text-white">뒤로가기</Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-400">일시: {new Date(selectedHistory.timestamp).toLocaleString()}</p>
          <div className="text-xl font-black flex items-center gap-2">
            승리 진영: <span className={cn("px-3 py-1 rounded-lg text-sm", selectedHistory.winner === 'good' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-500')}>{selectedHistory.winner === 'good' ? '선의 승리' : '악의 승리'}</span>
            <span className="text-sm text-slate-500 font-bold ml-2">({selectedHistory.winReason})</span>
          </div>
        </div>

        {selectedHistory.evilInfo && (
           <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/30 space-y-2">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-3">초기 악마 정보</h3>
              <p className="text-sm text-slate-300"><span className="text-rose-400 font-bold">초기 악마:</span> {selectedHistory.players.find(p => p.uid === selectedHistory.evilInfo?.demonUid)?.name || '알 수 없음'}</p>
              <p className="text-sm text-slate-300"><span className="text-rose-400 font-bold">초기 하수인:</span> {selectedHistory.evilInfo?.minionUids?.map(u => selectedHistory.players.find(p => p.uid === u)?.name).join(', ') || '없음'}</p>
              <p className="text-sm text-slate-300"><span className="text-rose-400 font-bold">악마 블러프:</span> {selectedHistory.evilInfo?.bluffs?.map(b => getRoleName(b)).join(', ') || '없음'}</p>
           </div>
        )}

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

        <div className="space-y-8">
          {dayArray.map(day => {
             const nightIdx = day - 1;
             const log = selectedHistory.dayLogs?.[day];
             const nightPlayers = getSortedNightPlayers(nightIdx);
             return (
               <div key={day} className="space-y-4 relative">
                  {/* Night Phase */}
                  <div className="bg-indigo-950/20 p-5 rounded-2xl border border-indigo-900/30">
                     <h4 className="text-md font-black text-indigo-400 mb-4">{day}일차 밤</h4>
                     <div className="space-y-3">
                        {nightPlayers.length > 0 ? nightPlayers.map(p => (
                           <div key={p.uid} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                              <span className="font-bold text-indigo-300 text-xs block mb-1">
                                {p.name} ({p.fakeCharacter ? `주정뱅이-착각: ${getRoleName(p.fakeCharacter)}` : getRoleName(p.character)})
                              </span>
                              <div className="text-xs text-slate-400 whitespace-pre-wrap pl-2 border-l-2 border-slate-700">
                                 {formatNightMessage(p.messageHistory[nightIdx])}
                              </div>
                           </div>
                        )) : (
                           <p className="text-xs text-slate-600">행동 기록 없음</p>
                        )}
                     </div>
                  </div>

                  {/* Day Phase */}
                  {log && (
                     <div className="bg-sky-950/20 p-5 rounded-2xl border border-sky-900/30">
                       <h4 className="text-md font-black text-sky-400 mb-4">{day}일차 낮</h4>
                       
                       {log.abilityLogs && log.abilityLogs.length > 0 && (
                          <div className="mb-4">
                             <h5 className="text-xs font-black text-slate-500 mb-2">낮 능력 발동 내역</h5>
                             <ul className="space-y-2">
                               {log.abilityLogs.map((aLog, idx) => (
                                 <li key={idx} className="text-sm text-amber-400 font-bold bg-amber-950/20 p-3 rounded-lg border border-amber-900/30">
                                   {aLog}
                                 </li>
                               ))}
                             </ul>
                          </div>
                       )}

                       <div className="mb-4">
                          <h5 className="text-xs font-black text-slate-500 mb-2">투표 내역</h5>
                          {log.nominations && log.nominations.length > 0 ? (
                             <ul className="space-y-2">
                               {log.nominations.map((n, idx) => (
                                 <li key={idx} className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                   <div className="flex justify-between items-center mb-1">
                                      <span><span className="text-slate-500 text-xs mr-2">[{n.nominatorName} 지목]</span><strong className="text-white">{n.targetName}</strong></span>
                                      <span className="text-sky-400 text-xs font-bold bg-sky-500/10 px-2 py-0.5 rounded">찬성 {n.yesCount}명</span>
                                   </div>
                                   <span className="text-[10px] text-slate-500 block">투표자: {n.voterNames.join(', ') || '없음'}</span>
                                 </li>
                               ))}
                             </ul>
                          ) : (
                             <p className="text-xs text-slate-600">투표 없음</p>
                          )}
                       </div>

                       {log.executedUid && (
                          <div className="bg-rose-950/30 border border-rose-500/20 p-3 rounded-xl text-sm flex items-center justify-between">
                             <span className="text-rose-500 font-black">처형됨</span>
                             <span className="font-bold text-white">{selectedHistory.players.find(p => p.uid === log.executedUid)?.name}</span>
                          </div>
                       )}
                     </div>
                  )}
               </div>
             );
          })}
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
