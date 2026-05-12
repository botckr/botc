import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, useGameData } from '../../hooks/useFirebaseSync';
import type { RoleType, Alignment } from '../../types/character';
import type { SecretPlayer } from '../../types/game';
import { Button } from '../ui/Button';

const TROUBLE_BREWING_ROLES: { id: RoleType; name: string; align: Alignment; type: string }[] = [
  { id: 'washerwoman', name: '세탁부', align: 'good', type: 'townsfolk' },
  { id: 'librarian', name: '사서', align: 'good', type: 'townsfolk' },
  { id: 'investigator', name: '조사관', align: 'good', type: 'townsfolk' },
  { id: 'chef', name: '요리사', align: 'good', type: 'townsfolk' },
  { id: 'empath', name: '공감자', align: 'good', type: 'townsfolk' },
  { id: 'fortune_teller', name: '점쟁이', align: 'good', type: 'townsfolk' },
  { id: 'undertaker', name: '장의사', align: 'good', type: 'townsfolk' },
  { id: 'monk', name: '수도승', align: 'good', type: 'townsfolk' },
  { id: 'ravenkeeper', name: '까마귀사육사', align: 'good', type: 'townsfolk' },
  { id: 'virgin', name: '처녀', align: 'good', type: 'townsfolk' },
  { id: 'slayer', name: '슬레이어', align: 'good', type: 'townsfolk' },
  { id: 'soldier', name: '군인', align: 'good', type: 'townsfolk' },
  { id: 'mayor', name: '시장', align: 'good', type: 'townsfolk' },
  { id: 'butler', name: '집사', align: 'good', type: 'outsider' },
  { id: 'drunk', name: '주정뱅이', align: 'good', type: 'outsider' },
  { id: 'recluse', name: '은둔자', align: 'good', type: 'outsider' },
  { id: 'saint', name: '성자', align: 'good', type: 'outsider' },
  { id: 'poisoner', name: '독술사', align: 'evil', type: 'minion' },
  { id: 'spy', name: '스파이', align: 'evil', type: 'minion' },
  { id: 'scarlet_woman', name: '홍등가 여인', align: 'evil', type: 'minion' },
  { id: 'baron', name: '남작', align: 'evil', type: 'minion' },
  { id: 'imp', name: '임프', align: 'evil', type: 'demon' },
];

const GET_BASE_PROPORTIONS = (count: number) => {
  if (count === 5) return { townsfolk: 3, outsider: 0, minion: 1, demon: 1 };
  if (count === 6) return { townsfolk: 3, outsider: 1, minion: 1, demon: 1 };
  if (count >= 7 && count <= 9) return { townsfolk: 5, outsider: count - 7, minion: 1, demon: 1 };
  if (count >= 10 && count <= 12) return { townsfolk: 7, outsider: count - 10, minion: 2, demon: 1 };
  if (count >= 13 && count <= 15) return { townsfolk: 9, outsider: count - 13, minion: 3, demon: 1 };
  return { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
};

export function GrimoireSetup() {
  const { roomId, roomState } = useGameStore();
  const { updateSecretState } = useSecretData(roomId, true);
  const { updatePublicState } = useGameData(roomId);

  const [orderedPlayers, setOrderedPlayers] = useState<{ uid: string; name: string }[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Record<string, RoleType>>({});
  const [redHerringUid, setRedHerringUid] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roomState?.players && orderedPlayers.length === 0) {
      setOrderedPlayers(Object.values(roomState.players).map(p => ({ uid: p.uid, name: p.name })));
    }
  }, [roomState?.players, orderedPlayers.length]);

  useEffect(() => {
    const hasFortuneTeller = Object.values(assignedRoles).includes('fortune_teller');
    if (hasFortuneTeller) {
      if (!redHerringUid || assignedRoles[redHerringUid] === 'imp') {
        const nonDemons = orderedPlayers.filter(p => assignedRoles[p.uid] !== 'imp');
        const randomRedHerring = nonDemons[Math.floor(Math.random() * nonDemons.length)]?.uid;
        if (randomRedHerring) setRedHerringUid(randomRedHerring);
      }
    } else {
      setRedHerringUid("");
    }
  }, [assignedRoles, orderedPlayers, redHerringUid]);

  const movePlayer = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= orderedPlayers.length) return;
    const newArr = [...orderedPlayers];
    [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
    setOrderedPlayers(newArr);
  };

  const handleRandomSeats = () => {
    setOrderedPlayers([...orderedPlayers].sort(() => Math.random() - 0.5));
  };

  // BARON LOGIC included in proportions
  const getProportions = () => {
    const base = GET_BASE_PROPORTIONS(orderedPlayers.length);
    const hasBaron = Object.values(assignedRoles).includes('baron');
    if (hasBaron) {
       return { ...base, townsfolk: Math.max(0, base.townsfolk - 2), outsider: base.outsider + 2 };
    }
    return base;
  };

  const handleRandomRoles = () => {
    let props = GET_BASE_PROPORTIONS(orderedPlayers.length);
    
    // 1. 하수인 먼저 무작위 선택
    const allMinions = TROUBLE_BREWING_ROLES.filter(r => r.type === 'minion').sort(() => Math.random() - 0.5);
    const selectedMinions = allMinions.slice(0, props.minion);
    
    // 2. 남작(Baron)이 포함되었는지 확인 후 비율 조정
    const hasBaron = selectedMinions.some(m => m.id === 'baron');
    if (hasBaron) {
       props = { ...props, townsfolk: Math.max(0, props.townsfolk - 2), outsider: props.outsider + 2 };
    }

    const townsfolks = TROUBLE_BREWING_ROLES.filter(r => r.type === 'townsfolk').sort(() => Math.random() - 0.5);
    const outsiders = TROUBLE_BREWING_ROLES.filter(r => r.type === 'outsider').sort(() => Math.random() - 0.5);
    const demon = TROUBLE_BREWING_ROLES.find(r => r.type === 'demon')!;

    const pool = [
      ...townsfolks.slice(0, props.townsfolk).map(r => r.id),
      ...outsiders.slice(0, props.outsider).map(r => r.id),
      ...selectedMinions.map(r => r.id),
      demon.id
    ].sort(() => Math.random() - 0.5);

    const newAssigned: Record<string, RoleType> = {};
    orderedPlayers.forEach((p, i) => { newAssigned[p.uid] = pool[i]; });
    setAssignedRoles(newAssigned);
  };

  const handleStartGame = async () => {
    if (!roomId || !roomState) return;
    const hasFortuneTeller = Object.values(assignedRoles).includes('fortune_teller');
    
    let finalRedHerringUid = redHerringUid;
    if (hasFortuneTeller && !finalRedHerringUid) {
       // 악마가 아닌 플레이어 중 무작위로 한 명을 레드헤링으로 자동 지정
       const nonDemons = orderedPlayers.filter(p => assignedRoles[p.uid] !== 'imp');
       finalRedHerringUid = nonDemons[Math.floor(Math.random() * nonDemons.length)]?.uid;
    }

    setLoading(true);
    try {
      const selectedRoles = Object.values(assignedRoles);
      const townsfolkRoles = TROUBLE_BREWING_ROLES.filter(r => r.type === 'townsfolk');
      const unusedTownsfolk = townsfolkRoles.filter(r => !selectedRoles.includes(r.id));
      
      const newSecretPlayers: Record<string, SecretPlayer> = {};
      let demonUid = "";
      const minionUids: string[] = [];

      orderedPlayers.forEach((p) => {
        const roleId = assignedRoles[p.uid];
        const roleDef = TROUBLE_BREWING_ROLES.find(r => r.id === roleId);
        
        if (roleId === 'imp') demonUid = p.uid;
        if (roleDef?.type === 'minion') minionUids.push(p.uid);

        let fakeChar: RoleType | null = null;
        if (roleId === 'drunk') {
           const randomIndex = Math.floor(Math.random() * unusedTownsfolk.length);
           fakeChar = unusedTownsfolk[randomIndex].id;
           unusedTownsfolk.splice(randomIndex, 1);
        }

        newSecretPlayers[p.uid] = {
          character: roleId || null,
          originalCharacter: roleId || null,
          fakeCharacter: fakeChar,
          alignment: roleDef?.align || null,
          isDrunk: roleId === 'drunk',
          isPoisoned: false,
          bluffs: [],
          // Mark as Red Herring if selected
          isRedHerring: p.uid === finalRedHerringUid
        } as any;
      });

      const demonBluffs = townsfolkRoles
        .filter(r => !selectedRoles.includes(r.id) && !Object.values(newSecretPlayers).some(sp => (sp as any).fakeCharacter === r.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(r => r.id);

      // Distribute Evil Info to each evil player's node
      const demonName = roomState.players[demonUid]?.name || "";
      const minionNames = minionUids.map(uid => roomState.players[uid]?.name || "");

      Object.keys(newSecretPlayers).forEach(uid => {
        const p = newSecretPlayers[uid];
        if (p.alignment === 'evil') {
           p.evilTeamInfo = {
             demonName,
             minionNames,
             bluffs: demonBluffs
           };
        }
      });

      await updateSecretState({ players: newSecretPlayers } as any);

      const newPublicPlayers = { ...roomState.players };
      orderedPlayers.forEach((p, index) => {
        if (newPublicPlayers[p.uid]) newPublicPlayers[p.uid].seatIndex = index;
      });

      await updatePublicState({
        players: newPublicPlayers,
        status: 'night',
        dayNumber: 1,
        highestVotes: 0,
        executionTargetUid: null,
        events: {}
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const props = getProportions();
  const allAssigned = orderedPlayers.length > 0 && orderedPlayers.every(p => assignedRoles[p.uid]);
  const hasFortuneTeller = Object.values(assignedRoles).includes('fortune_teller');

  const radius = 120;
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { left: `${150 + radius * Math.cos(angle)}px`, top: `${150 + radius * Math.sin(angle)}px` };
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl animate-fade-in pb-10">
      <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-sky-400 font-serif uppercase tracking-tight">Grimoire Design</h2>
            <p className="text-xs text-slate-500 font-mono mt-1">Sess: {roomId} | Count: {orderedPlayers.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-black">Target Ratio</p>
            <div className="flex gap-2 text-xs font-black">
              <span className="text-sky-400">T{props.townsfolk}</span>
              <span className="text-amber-400">O{props.outsider}</span>
              <span className="text-rose-400">M{props.minion}</span>
              <span className="text-rose-600">D{props.demon}</span>
            </div>
          </div>
        </div>

        <div className="relative w-[300px] h-[300px] mx-auto mb-10 bg-slate-950/50 rounded-full border border-slate-800/30">
          {orderedPlayers.map((p, i) => {
            const pos = getPosition(i, orderedPlayers.length);
            const role = assignedRoles[p.uid];
            const roleDef = TROUBLE_BREWING_ROLES.find(r => r.id === role);
            const isRH = p.uid === redHerringUid;
            return (
              <div key={p.uid} style={pos} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div 
                  onClick={() => hasFortuneTeller && setRedHerringUid(p.uid)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all shadow-lg overflow-hidden cursor-pointer
                  ${roleDef?.align === 'good' ? 'border-sky-500 bg-sky-950/80 text-sky-400' : 
                    roleDef?.align === 'evil' ? 'border-rose-500 bg-rose-950/80 text-rose-400' : 
                    'border-slate-700 bg-slate-900 text-slate-500'}
                  ${isRH ? 'ring-4 ring-amber-500 ring-offset-2 ring-offset-slate-950' : ''}`}
                >
                  {roleDef ? roleDef.name.substring(0, 2) : i + 1}
                </div>
                <div className="mt-1 text-xs text-slate-400 font-black uppercase whitespace-nowrap bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">{p.name}</div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant="secondary" size="sm" onClick={handleRandomSeats} className="flex-1 text-xs font-black uppercase">자리 섞기</Button>
          <Button variant="secondary" size="sm" onClick={handleRandomRoles} className="flex-1 text-xs font-black uppercase">역할 무작위 배정</Button>
        </div>

        {hasFortuneTeller && (
           <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center animate-fade-in">
             <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">Fortune Teller Active</p>
             <p className="text-sm text-slate-300">위의 원형 배치도에서 **환각(주민)**을 한 명 클릭하여 지정하세요.</p>
           </div>
        )}

        <div className="space-y-1.5 pr-2">
          {orderedPlayers.map((p, index) => (
            <div key={p.uid} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center gap-3 transition-colors hover:bg-slate-900/50">
              <div className="flex flex-col gap-1">
                <button onClick={() => movePlayer(index, -1)} disabled={index === 0} className="text-slate-600 hover:text-sky-400 disabled:opacity-10 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 2L15 10H0L7.5 2Z" fill="currentColor"/></svg>
                </button>
                <button onClick={() => movePlayer(index, 1)} disabled={index === orderedPlayers.length - 1} className="text-slate-600 hover:text-sky-400 disabled:opacity-10 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 13L0 5H15L7.5 13Z" fill="currentColor"/></svg>
                </button>
              </div>
              <span className="text-xs font-black text-slate-700 w-4 font-mono">{index + 1}</span>
              <span className="text-xs font-bold text-slate-300 flex-1 truncate uppercase">{p.name}</span>
              <select
                value={assignedRoles[p.uid] || ''}
                onChange={(e) => setAssignedRoles(prev => ({ ...prev, [p.uid]: e.target.value as RoleType }))}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg p-1.5 outline-none focus:border-sky-500 w-28 appearance-none text-center cursor-pointer"
              >
                <option value="" disabled>-- SELECT --</option>
                <optgroup label="🏘️ 주민 (Townsfolk)">
                  {TROUBLE_BREWING_ROLES.filter(r => r.type === 'townsfolk').map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🤡 외부인 (Outsider)">
                  {TROUBLE_BREWING_ROLES.filter(r => r.type === 'outsider').map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </optgroup>
                <optgroup label="😈 하수인 (Minion)">
                  {TROUBLE_BREWING_ROLES.filter(r => r.type === 'minion').map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </optgroup>
                <optgroup label="👹 악마 (Demon)">
                  {TROUBLE_BREWING_ROLES.filter(r => r.type === 'demon').map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleStartGame}
        disabled={loading || !allAssigned}
        isLoading={loading}
        variant="primary"
        size="lg"
        className="w-full shadow-2xl font-black uppercase tracking-widest border-transparent"
      >
        Seal Grimoire & First Night
      </Button>
    </div>
  );
}
