import { Button } from '../ui/Button';

interface VoteControlsProps {
  isST: boolean;
  userUid: string;
  roomState: any;
  currentNomination: any;
  voters: Record<string, boolean>;
  playerSecret: any;
  handleVote: (vote: boolean) => void;
  endVoting: () => void;
  handleCancelNomination: () => void;
}

export function VoteControls({
  isST,
  userUid,
  roomState,
  voters,
  playerSecret,
  handleVote,
  endVoting,
  handleCancelNomination
}: VoteControlsProps) {
  const myPlayer = roomState.players[userUid];
  const myRole = playerSecret?.fakeCharacter || playerSecret?.character;

  return (
    <>
      {!isST ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            {voters[userUid] === true ? (
              <Button 
                onClick={() => handleVote(false)} 
                variant="danger" 
                size="lg" 
                className="flex-1 font-black h-20 text-xl shadow-xl transition-all border-rose-500/30"
              >
                투표 취소 (Cancel)
              </Button>
            ) : (
              <Button 
                onClick={() => handleVote(true)} 
                variant="primary" 
                size="lg" 
                className="flex-1 font-black h-20 text-xl shadow-xl transition-all"
                disabled={myRole === 'butler' && !myPlayer?.isDead ? (!playerSecret?.butlerMasterUid || voters[playerSecret.butlerMasterUid] !== true) : false}
              >
                찬성 투표 (Vote)
              </Button>
            )}
          </div>
          {myRole === 'butler' && !myPlayer?.isDead && (
             <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">집사 제약 (Butler Restriction)</p>
                <p className="text-sm text-slate-300 font-medium">
                  {playerSecret?.butlerMasterUid 
                    ? voters[playerSecret.butlerMasterUid] === true
                       ? <span className="text-emerald-400">주인({roomState.players[playerSecret.butlerMasterUid]?.name})이 찬성했습니다. 이제 투표할 수 있습니다!</span>
                       : <span className="text-amber-400/80">주인({roomState.players[playerSecret.butlerMasterUid]?.name})의 찬성 투표를 기다리고 있습니다...</span>
                    : <span className="text-rose-400">어젯밤 주인을 선택하지 않아 오늘 투표할 수 없습니다.</span>
                  }
                </p>
             </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
           <div className="flex flex-col gap-3">
              <Button onClick={endVoting} variant="primary" size="lg" className="w-full font-black uppercase h-16 shadow-xl border-transparent">투표 결과 확정</Button>
              <Button onClick={handleCancelNomination} variant="ghost" className="w-full text-xs text-slate-500 uppercase tracking-widest font-black underline underline-offset-8 decoration-slate-800">투표 취소 및 돌아가기</Button>
           </div>
        </div>
      )}
    </>
  );
}
