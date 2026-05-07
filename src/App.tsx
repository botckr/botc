import { lazy, Suspense, useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { STLobby } from './components/game/STLobby'
import { PlayerLobby } from './components/game/PlayerLobby'
import { useGameStore } from './store/gameStore'
import { useGameData } from './hooks/useFirebaseSync'
import { ref, get, onValue } from 'firebase/database'
import { database } from './lib/firebase'

// Lazy load large components
const DayPhase = lazy(() => import('./components/game/DayPhase').then(m => ({ default: m.DayPhase })));
const NightPhase = lazy(() => import('./components/game/NightPhase').then(m => ({ default: m.NightPhase })));

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
    <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sky-400 font-medium tracking-wide animate-pulse uppercase tracking-widest text-[10px]">Loading Phase...</p>
  </div>
);

function App() {
  const { user, loading, error: authError } = useAuth()
  const { roomId, roomState, role, setRole, setRoomId, setRoomState } = useGameStore()

  const { error: syncError, resetRoom } = useGameData(roomId)
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [stPassword, setStPassword] = useState('');
  const [showSTLogin, setShowSTLogin] = useState(false);

  // Pre-warm Firebase database connection
  useEffect(() => {
    const connectedRef = ref(database, ".info/connected");
    const unsubscribe = onValue(connectedRef, () => {
      // Just attaching this listener keeps the WebSocket connection alive 
      // so that `get()` calls later are instant.
    });
    return () => unsubscribe();
  }, []);

  const resetSession = () => {
    setRole(null);
    setRoomId(null);
    setRoomState(null);
    setShowSTLogin(false);
    setStPassword('');
  };

  const handleGlobalReset = async () => {
    if (window.confirm("주의: 방의 모든 기록이 삭제되며 모든 플레이어가 튕겨나갑니다. 정말 초기화하시겠습니까?")) {
       await resetRoom();
       resetSession();
    }
  };

  const handleSTLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stPassword) return;

    setIsAuthenticating(true);
    try {
      const authRef = ref(database, `admin_auth/${stPassword}`);
      const snapshot = await get(authRef);
      
      const val = snapshot.val();
      // 지원: boolean true 또는 문자열 "true"
      if (snapshot.exists() && (val === true || val === "true")) {
        setRole('st');
      } else {
        alert("암호가 일치하지 않거나 권한이 없습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("인증에 실패했습니다. Firebase 규칙을 확인하세요.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Game Phases
  const isDayPhase = roomState?.status === 'day' || roomState?.status === 'voting';
  const isNightPhase = roomState?.status === 'night';
  const gameStarted = roomState && roomState.status !== 'lobby' && roomState.status !== 'setup';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center">
      <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 animate-fade-in max-w-lg mx-auto">
        <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl w-full flex flex-col items-center border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
          {!gameStarted && (
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-sky-600 mb-8 text-center tracking-tighter drop-shadow-sm uppercase">
              BotC Digital Grimmoire
            </h1>
          )}
          
          <div className="text-slate-300 mb-6 text-center w-full">
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                 <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">본인 인증 확인 중...</p>
              </div>
            )}

            {(authError || syncError) && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-4 shadow-inner">
                <p className="text-rose-500 text-xs font-bold uppercase tracking-tight mb-2">동기화 연결 끊김</p>
                <p className="text-[11px] text-slate-400 mb-4">{authError?.message || syncError?.message}</p>
                <button onClick={resetSession} className="text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all">세션 강제 초기화</button>
              </div>
            )}
            
            {user && role && roomId && !roomState && (
               <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                  <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sky-400 font-medium tracking-wide animate-pulse">마도서 기록 복구 중...</p>
                  <button onClick={resetSession} className="text-sm text-slate-400 underline mt-6 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-black">기록 삭제하고 처음으로</button>
               </div>
            )}

            {user && !role && !roomId && (
              <div className="flex flex-col gap-8 mt-2 w-full animate-fade-in">
                <div className="space-y-4">
                  <PlayerLobby />
                </div>

                <div className="pt-6 border-t border-slate-800/30 w-full">
                  {!showSTLogin ? (
                    <button 
                      onClick={() => setShowSTLogin(true)}
                      className="text-slate-600 hover:text-amber-500/80 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      <span className="opacity-50">스토리텔러 관리자 모드</span>
                    </button>
                  ) : (
                    <form onSubmit={handleSTLogin} className="flex flex-col gap-3 animate-fade-in max-w-[240px] mx-auto">
                      <div className="relative">
                        <input 
                          type="password"
                          value={stPassword}
                          onChange={(e) => setStPassword(e.target.value)}
                          placeholder="ST 암호 입력"
                          autoFocus
                          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-amber-500/50 transition-all text-center tracking-widest"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowSTLogin(false)}
                          className="flex-1 text-[9px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          취소
                        </button>
                        <button 
                          type="submit"
                          disabled={isAuthenticating || !stPassword}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 text-[9px] font-black uppercase py-2 rounded-md transition-all shadow-lg shadow-amber-950/20"
                        >
                          {isAuthenticating ? '확인 중...' : '접속'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {user && role === 'st' && (!roomState?.status || roomState?.status === 'lobby' || roomState?.status === 'setup') && <STLobby />}
            {user && role === 'player' && roomState && (roomState?.status === 'lobby' || roomState?.status === 'setup') && <PlayerLobby />}
            
            <Suspense fallback={<LoadingSpinner />}>
              {user && role && isDayPhase && <DayPhase isST={role === 'st'} />}
              {user && role && isNightPhase && <NightPhase isST={role === 'st'} />}
            </Suspense>
          </div>
          
          {role && (!roomState || roomState.status === 'lobby' || roomState.status === 'setup') && (
            <button 
              onClick={resetSession}
              className="mt-6 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <span>←</span> 역할 변경
            </button>
          )}
        </div>
      </div>

      {/* Victory Screen Modal (Escaped from overflow-hidden) */}
      {roomState?.status === 'end' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md overflow-y-auto flex p-4 animate-fade-in">
           <div className={`m-auto bg-slate-900 border-2 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full space-y-8 relative overflow-hidden ${roomState.winner === 'good' ? "border-sky-500/50 shadow-sky-500/20" : "border-rose-600/50 shadow-rose-600/20"}`}>
              
              <div className="flex flex-col items-center justify-center space-y-3">
                 <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter italic leading-none ${roomState.winner === 'good' ? "text-sky-400" : "text-rose-500"}`}>
                   {roomState.winner === 'good' ? '선의 승리' : '악의 승리'}
                 </h2>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">게임 종료</p>
              </div>

              <div className="py-8 bg-slate-950/80 rounded-[2rem] border border-slate-800 shadow-inner px-5">
                 <p className="text-sm text-slate-200 font-medium leading-relaxed break-keep-all">
                    {roomState.winner === 'good' 
                      ? "악마가 처단되었습니다. 마을에 평화가 찾아왔습니다." 
                      : "그림자가 마을을 삼켰습니다. 악의 진영이 승리했습니다."}
                 </p>
              </div>

              <button 
                onClick={role === 'st' ? handleGlobalReset : resetSession} 
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl transition-all active:scale-95 ${roomState.winner === 'good' ? "bg-sky-500 text-slate-950 hover:bg-sky-400" : "bg-rose-600 text-white hover:bg-rose-500"}`}
              >
                {role === 'st' ? '방 전체 초기화' : '로비로 돌아가기'}
              </button>
           </div>
        </div>
      )}

      {/* Admin Reset Button (Nuclear Reset) */}
      {role === 'st' && roomId && (
        <button 
          onClick={handleGlobalReset}
          className="fixed bottom-4 right-4 bg-rose-950/40 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all z-[100] backdrop-blur"
        >
          방 전체 초기화
        </button>
      )}
    </div>
  )
}

export default App
