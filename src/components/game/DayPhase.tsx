import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData, useSecretData } from '../../hooks/useFirebaseSync';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { TownSquare } from './TownSquare';
import { PlayerIdentity } from './shared/PlayerIdentity';
import { PlayerRecords } from './shared/PlayerRecords';
import { VoteControls } from './VoteControls';
import { NominationHistory } from './NominationHistory';
import { useVotingLogic } from '../../hooks/useVotingLogic';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { cn } from '../../lib/utils/cn';

export function DayPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret } = usePlayerSecretData(roomId, user?.uid || null);
  const { secretState } = useSecretData(roomId, isST);

  const {
    handleResolveSlayer,
    handleCancelNomination,
    handleVote,
    endVoting,
    finalizeDay,
    handleSlayerShot,
    majorityNeeded,
    yesCount
  } = useVotingLogic(roomId, roomState, secretState, user, isST, playerSecret);

  if (!roomState || !user || !roomId) return null;

  const events = roomState?.events || {};
  const lastEventId = Object.keys(events).sort().pop();
  const lastEvent = lastEventId ? events[lastEventId] : null;

  const myRole = playerSecret?.fakeCharacter || playerSecret?.character;
  const players = Object.values(roomState.players).sort((a: any, b: any) => a.seatIndex - b.seatIndex);
  const isVoting = roomState.status === 'voting';
  const currentNominationKey = roomState.nominations ? Object.keys(roomState.nominations)[0] : null;
  const currentNomination = currentNominationKey && roomState.nominations ? roomState.nominations[currentNominationKey] : null;

  const voters = currentNomination?.voters || {};

  const butlerEntry = isST && secretState?.players ? Object.entries(secretState.players).find(([_, p]: any) => (p.fakeCharacter || p.character) === 'butler') : null;
  const butlerUid = butlerEntry?.[0];
  const butlerSecret = butlerEntry?.[1] as any;
  const butlerPlayer = butlerUid ? roomState.players[butlerUid] : null;
  const butlerVoted = butlerUid ? voters[butlerUid] === true : false;
  const masterUid = butlerSecret?.butlerMasterUid;
  const masterVoted = masterUid ? voters[masterUid] === true : false;
  const isButlerVotingIllegally = butlerVoted && !masterVoted && butlerPlayer && !butlerPlayer.isDead;

  const hasPendingSlayerShot = Object.values(events).some((e: any) => e.type === 'slayer_shot' && e.actorUid === user.uid && e.status === 'pending');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto animate-fade-in pb-20 px-0 sm:px-4">
      
      {/* Left Column: Board & Identity & Actions */}
      <div className="flex flex-col gap-6">
        {!isST && (
          <PlayerIdentity 
            character={playerSecret?.character || null}
            fakeCharacter={playerSecret?.fakeCharacter}
            alignment={playerSecret?.alignment || null}
            evilTeamInfo={playerSecret?.evilTeamInfo}
          />
        )}

        <TownSquare />

        {/* Slayer Shot */}
        {!isST && (myRole === 'slayer' || playerSecret?.alignment === 'evil') && !roomState.players[user.uid]?.isDead && !playerSecret?.isUsed && !hasPendingSlayerShot && (
           <div className="bg-rose-950/30 p-8 rounded-[3rem] border border-rose-500/30 text-center shadow-2xl mt-4 space-y-6 relative overflow-hidden mx-4 sm:mx-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/20 animate-pulse"></div>
              <p className="text-sm text-rose-500 font-black uppercase tracking-[0.4em] mb-2">Execute Slayer's Shot</p>
              <div className="grid grid-cols-1 gap-2">
                 {players.filter((p: any) => !p.isDead && p.uid !== user.uid).map((p: any) => (
                   <Button key={p.uid} onClick={() => handleSlayerShot(p.uid)} variant="danger" className="w-full font-black uppercase tracking-widest h-14 text-base shadow-xl border-transparent">KILL {p.name}</Button>
                 ))}
              </div>
           </div>
        )}
      </div>

      {lastEvent && lastEvent.type === 'slayer_shot' && (Date.now() - lastEvent.timestamp < 60000) && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-rose-950/90 border border-rose-500 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(225,29,72,0.3)] text-center space-y-6 w-full max-w-sm">
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-rose-300 mb-2">Slayer Shot Result</p>
                <p className="text-xl sm:text-2xl font-black bg-slate-950/50 p-4 rounded-2xl border border-rose-500/30">
                   {lastEvent.actorName} <br/><span className="text-xs text-rose-300 my-2 block">▶ targeted ▶</span> {lastEvent.targetName}
                </p>
             </div>
             
             {lastEvent.status === 'pending' ? (
                <div className="animate-pulse flex flex-col items-center">
                   <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4"></div>
                   <p className="font-black text-rose-200 uppercase tracking-widest text-sm">ST 판독 대기 중...</p>
                   {isST && lastEventId && (
                      <Button onClick={() => handleResolveSlayer(lastEventId, lastEvent)} variant="primary" className="mt-6 w-full bg-rose-600 hover:bg-rose-500 text-white h-14 font-black">판독 결과 확정</Button>
                   )}
                </div>
             ) : (
                <div className="space-y-4">
                   <p className={cn("text-4xl sm:text-5xl font-black uppercase tracking-tighter drop-shadow-lg", lastEvent.status === 'dead' ? 'text-white animate-bounce' : 'text-slate-400 opacity-80')}>
                      {lastEvent.status === 'dead' ? 'DEAD!' : 'MISS...'}
                   </p>
                   {isST && lastEventId && (
                      <Button onClick={() => update(ref(database), { [`public/rooms/${roomId}/events/${lastEventId}`]: null })} variant="secondary" className="w-full bg-slate-900 text-white border-transparent hover:bg-slate-800 h-14 font-black">닫기</Button>
                   )}
                </div>
             )}
           </div>
        </div>
      )}

      {/* Right Column: Status & Voting & History */}
      <div className="flex flex-col gap-6">
         <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-slate-800 backdrop-blur flex justify-between items-center shadow-lg mx-4 sm:mx-0">
           <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter font-serif">{roomState.dayNumber}일차 낮</h2>
           {roomState.executionTargetUid && (
             <div className="text-right">
               <p className="text-xs text-rose-500 font-black uppercase tracking-widest">Candidate</p>
               <p className="text-base text-white font-bold">{roomState.players[roomState.executionTargetUid]?.name}</p>
             </div>
           )}
         </div>

         {isVoting && currentNomination && (
           <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-sky-500/30 text-center relative overflow-hidden shadow-2xl animate-fade-in mx-4 sm:mx-0">
             <h3 className="text-sky-400 font-black uppercase text-sm tracking-[0.3em] mb-6">투표 진행 중</h3>
             <p className="text-slate-300 mb-8 leading-tight">
                <span className="text-slate-500 text-sm uppercase font-bold mb-2 block tracking-widest">지목자: {roomState.players[currentNomination.nominatorUid]?.name}</span>
                <span className="font-black text-white text-3xl uppercase tracking-tighter border-b-4 border-sky-500/20 pb-1 inline-block">{roomState.players[currentNomination.targetUid]?.name}</span>
             </p>
             <div className="flex justify-center mb-10">
               <div className="flex flex-col items-center bg-slate-900/60 p-8 rounded-[2rem] border border-sky-500/20 shadow-inner relative min-w-[160px]">
                 <span className="text-4xl font-black text-sky-400 mb-3">{yesCount}</span>
                 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">찬성 (최소 필요: {majorityNeeded})</span>
                 {roomState.players[user.uid]?.isDead && roomState.players[user.uid]?.hasGhostVote && (
                    <div className="absolute -top-4 bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full animate-pulse shadow-lg">유령 투표권 있음</div>
                 )}
                 {roomState.players[user.uid]?.isDead && !roomState.players[user.uid]?.hasGhostVote && voters[user.uid] === true && (
                    <div className="absolute -top-4 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">투표권 소모됨</div>
                 )}
               </div>
             </div>
             
             {isST && isButlerVotingIllegally && (
               <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-2xl mb-4 text-center animate-pulse">
                  <p className="text-sm font-black text-rose-400 uppercase tracking-widest mb-1">⚠️ 룰 위반 경고</p>
                  <p className="text-xs text-rose-200">
                     집사(<span className="font-bold">{butlerPlayer?.name}</span>)가 찬성했지만, 
                     주인(<span className="font-bold">{roomState.players[masterUid || '']?.name || '알 수 없음'}</span>)이 찬성을 취소했습니다. 
                     집사가 스스로 투표를 취소하도록 안내해 주세요.
                  </p>
               </div>
             )}

             <VoteControls
                isST={isST}
                userUid={user.uid}
                roomState={roomState}
                currentNomination={currentNomination}
                voters={voters}
                playerSecret={playerSecret}
                handleVote={handleVote}
                endVoting={endVoting}
                handleCancelNomination={handleCancelNomination}
             />
           </div>
         )}

         {/* Nomination History */}
         <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-800 backdrop-blur shadow-xl mt-4 mx-4 sm:mx-0">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">오늘의 투표 기록</h3>
            
            <NominationHistory
               nominationHistory={roomState.nominationHistory}
               majorityNeeded={majorityNeeded}
            />

            {/* Admin skip/finalize button always visible for ST */}
            {isST && !isVoting && (
               <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-10 font-black uppercase tracking-[0.2em] h-16 shadow-2xl border-transparent">
                  {roomState.executionTargetUid ? '처형 후 밤이 됩니다' : '처형 없이 밤이 됩니다'}
               </Button>
            )}
         </div>

         {!isST && (
           <PlayerRecords 
             messageHistory={playerSecret?.messageHistory}
           />
         )}

         {isST && (
            <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-800 backdrop-blur shadow-xl mt-4 mx-4 sm:mx-0">
               <h3 className="text-xs font-black text-sky-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                  <span>👁️</span> ST 전용 과거 정보 전송 기록
               </h3>
               <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                  {players.map(p => {
                     const hist = secretState?.players[p.uid]?.messageHistory;
                     if (!hist || hist.length === 0) return null;
                     return (
                        <details key={p.uid} className="bg-slate-950/40 rounded-2xl border border-slate-800/60 overflow-hidden">
                           <summary className="cursor-pointer p-4 flex justify-between items-center text-sm font-black text-slate-300 hover:bg-slate-900/50 transition-colors list-none">
                              {p.name}
                              <span className="text-[10px] bg-sky-900/30 text-sky-400 px-2 py-1 rounded-md uppercase tracking-widest border border-sky-500/20">{hist.length}건</span>
                           </summary>
                           <div className="p-4 pt-0 space-y-2">
                              {hist.map((msg: string, i: number) => (
                                 <div key={i} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-sky-500 font-black mb-1.5 block uppercase tracking-widest">{i + 1}일차 밤</span>
                                    <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{msg}</p>
                                 </div>
                              ))}
                           </div>
                        </details>
                     )
                  })}
               </div>
            </div>
         )}
      </div>

    </div>
  );
}
