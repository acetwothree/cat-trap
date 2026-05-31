import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Coins, Settings, Store, X, Zap, Undo2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GRID_COLS, GRID_ROWS, CENTER_C, CENTER_R, Point, findCatPath, generateBoard, getCatEscapePathsCount, getNeighbors } from './lib/gameLogic';

type GameState = 'playing' | 'won' | 'lost';

const SKINS = [
  { id: 'mochi', name: 'Mochi', price: 0 },
  { id: 'void', name: 'The Void', price: 200 },
  { id: 'snow', name: 'Snowball', price: 500 },
  { id: 'tiger', name: 'Tiger', price: 1000 },
  { id: 'ghost', name: 'Ghost', price: 2000 },
] as const;

const PixelCat = ({ state, animationPhase, skin = 'mochi', className = "w-[46px] h-[46px]" }: { state: 'idle' | 'lost' | 'won' | 'scared', animationPhase: 'stand' | 'crouch' | 'leap' | 'land', skin?: string, className?: string }) => {
  let O = '#f97316';
  let W = '#ffffff';
  let B = '#1c1917';
  let P = '#f472b6';
  let D = '#ea580c';
  
  if (skin === 'void') {
    O = '#27272a'; W = '#3f3f46'; D = '#18181b'; B = '#000000';
  } else if (skin === 'snow') {
    O = '#f3f4f6'; W = '#ffffff'; D = '#e5e7eb'; B = '#1f2937'; P = '#fbcfe8';
  } else if (skin === 'ghost') {
    O = '#8b5cf6'; W = '#c4b5fd'; D = '#6d28d9'; B = '#4c1d95';
  } else if (skin === 'tiger') {
    O = '#f59e0b'; W = '#fef3c7'; D = '#1c1917'; B = '#451a03';
  }

  const cmap: Record<string, string> = { O, W, B, P, D };
  
  const frames = {
    stand: [
      "                ",
      "   B    B       ",
      "  BOB  BOB      ",
      " BOWWWWWWOB     ",
      " BWBBWWBBWB     ",
      " BWWWWWWWWB     ",
      "  BBDDWWBB      ",
      " BOWWWWWWOB     ",
      " BOWWWWWWOB     ",
      "  BBDDDDWB      ",
      "   BP  BPB      ",
      "   B    B       ",
      "                ",
      "                ",
      "                ",
      "                ",
    ],
    crouch: [
      "                ",
      "                ",
      "                ",
      "   B    B       ",
      "  BOB  BOB      ",
      " BOWWWWWWOB     ",
      " BWBBWWBBWB     ",
      " BWWWWWWWWB     ",
      "  BBDDWWBB      ",
      " BBWWWWWWOBB    ",
      " BOWWWWWWWOB    ",
      "  BBPWWBPBW     ",
      "   BB  BB       ",
      "                ",
      "                ",
      "                ",
    ],
    leap: [
      "                ",
      "   B    B       ",
      "  BOB  BOB      ",
      " BOWWWWWWOB     ",
      " BWBBWWBBWB     ",
      " BWWWWWWWWB     ",
      "  BBDDWWBB      ",
      " BDWWWWWWB      ",
      " BDOWWWOBD      ",
      " B BDDDB B      ",
      " WBP   PBW      ",
      " B       B      ",
      "                ",
      "                ",
      "                ",
      "                ",
    ],
    land: [
      "                ",
      "                ",
      "   B    B       ",
      "  BOB  BOB      ",
      " BOWWWWWWOB     ",
      " BW-BWW-BWB     ",
      " BWWWWWWWWB     ",
      "  BBDDWWBB      ",
      "  BWWWWWWB      ",
      " BBWWWOWWBB     ",
      " BOWWWWOBD      ",
      " BBPWWBPB       ",
      "  BB  BB        ",
      "                ",
      "                ",
      "                ",
    ],
    scared: [
      "                ",
      "   B    B       ",
      "  BOB  BOB      ",
      " BOWWWWWWOB     ",
      " BWBBWWBBWB     ",
      " BWWWWWWWWB     ",
      "  BBBBWWBB      ",
      " BOWWWWWWOB     ",
      " BOWWWWWWOB     ",
      "  BBDDDDWB      ",
      "   BP  BPB      ",
      "   B    B       ",
      "                ",
      "                ",
      "                ",
      "                ",
    ],
    lost: [
      "                ",
      "        B    B  ",
      "       BWWB BWWB",
      "      BOWWWWWWOB",
      "      BWBBWWBBWB",
      "    BBBWWWWWWWWB",
      "   BWWBBBDDWWBB ",
      "   BWOWWWWWWWOB ",
      " B  BWWWWWWWWOB ",
      "  BB BBBDDDDWB  ",
      "      BBP  BPB  ",
      "      BB    BB  ",
      "                ",
      "                ",
      "                ",
      "                ",
    ],
    won: [
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "  BB    BB      ",
      " BOWB  BOWB     ",
      " BBWWWWWWBB     ",
      " B-B-WW-B-B     ",
      " BWWWWWWWWB     ",
      "  BBWBBWBB      ",
      "  BP    PB      ",
      "  B      B      ",
      "                ",
    ]
  };

  let activeFrame = frames.stand;
  if (state === 'lost') activeFrame = frames.lost;
  else if (state === 'won') activeFrame = frames.won;
  else if (state === 'scared') activeFrame = frames.scared;
  else if (animationPhase === 'crouch') activeFrame = frames.crouch;
  else if (animationPhase === 'leap') activeFrame = frames.leap;
  else if (animationPhase === 'land') activeFrame = frames.land;

  const rects: any[] = [];
  activeFrame.forEach((row, y) => {
    [...row].forEach((char, x) => {
      if (cmap[char]) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={cmap[char]} />);
      } else if (char === '-') {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#1c1917" />);
      }
    });
  });

  return (
    <svg viewBox="0 0 16 16" className={className}>
      {rects}
    </svg>
  );
};

const getZoneTheme = (level: number) => {
  if (level <= 5) {
    return {
      name: "THE BARN",
      bgClass: "bg-[#254b30]",
      panelClass: "bg-[#254b30]",
      nodeClass: "bg-[#22c55e]",
      nodeHover: "group-hover:bg-[#16a34a]",
      nodeBorder: "border-[#166534]",
      fenceClass: "bg-[#d97706]",
      crackedClass: "bg-[#22c55e]/60",
      obstacle: "🪵",
      headerBg: "bg-[#2e1a0c] border-[#fcf8f2]",
      headerPattern: "repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 12px)",
      titleText: "text-[#fcf8f2]",
      zoneText: "text-amber-400",
      pillClass: "bg-[#1c0f07] border-white/5",
      pillText: "text-[#fcf8f2]",
      textClass: "text-[#fef3c7]",
      accentClass: "text-[#fde68a]"
    };
  } else {
    // Cat Cafe
    return {
      name: "CAT CAFE",
      bgClass: "bg-[#f5ebe0]", // warm pastel oat/cream canvas
      panelClass: "bg-[#f5ebe0]", 
      nodeClass: "bg-[#e8d2b7]", 
      nodeHover: "group-hover:bg-[#f1e0ca]",
      nodeBorder: "border-[#c4a991]",
      fenceClass: "bg-[#d97706]",
      crackedClass: "bg-[#e8d2b7]/60",
      obstacle: "📦",
      headerBg: "bg-[#eddfd3] border-[#e63946]", // latte cream with terracotta frame
      headerPattern: "none",
      titleText: "text-[#2f1f17]", // deep espresso title
      zoneText: "text-[#4a3728]",
      pillClass: "bg-[#fcf8f2] border-[#d4c5b9]",
      pillText: "text-[#4a3728]",
      textClass: "text-[#4a3728]",
      accentClass: "text-[#2f1f17]"
    };
  }
};

const STARS = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  angle: Math.random() * 360,
  distance: 60 + Math.random() * 180,
  size: 10 + Math.random() * 18,
  delay: Math.random() * 0.3
}));

export default function App() {
  const [gameState, setGameState] = useState<GameState>('playing');
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(200);
  const [catPos, setCatPos] = useState<Point>({ c: CENTER_C, r: CENTER_R });
  const [escapeDir, setEscapeDir] = useState<{dx: number, dy: number} | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [cracked, setCracked] = useState<Set<string>>(new Set());
  const [obstacles, setObstacles] = useState<Set<string>>(new Set());
  const [spills, setSpills] = useState<Set<string>>(new Set());
  
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isCatTurn, setIsCatTurn] = useState(false);
  const [catAnimationPhase, setCatAnimationPhase] = useState<'stand' | 'crouch' | 'leap' | 'land'>('stand');
  const prevCatPos = React.useRef(catPos);

  React.useEffect(() => {
    if (prevCatPos.current.c !== catPos.c || prevCatPos.current.r !== catPos.r) {
      setCatAnimationPhase('crouch');
      let t1 = setTimeout(() => setCatAnimationPhase('leap'), 100);
      let t2 = setTimeout(() => setCatAnimationPhase('land'), 300);
      let t3 = setTimeout(() => setCatAnimationPhase('stand'), 450);
      prevCatPos.current = catPos;
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [catPos]);

  // Economy & Meta States
  const [currentSkin, setCurrentSkin] = useState('mochi');
  const [purchasedSkins, setPurchasedSkins] = useState<Set<string>>(new Set(['mochi']));
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // New States for Game Feel
  const [lastState, setLastState] = useState<{ catPos: Point, blocked: Set<string> } | null>(null);
  
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [adRewardType, setAdRewardType] = useState<'coins' | 'rewind' | null>(null);

  const zoneTheme = getZoneTheme(level);

  const setupLevel = useCallback((newLevel: number, isRetry = false) => {
    const { blocked, cracked, obstacles, spills } = generateBoard(newLevel);
    setBlocked(blocked);
    setCracked(cracked);
    setObstacles(obstacles || new Set());
    setSpills(spills || new Set());
    setEscapeDir(null);
    setCatPos({ c: CENTER_C, r: CENTER_R });
    setGameState('playing');
    setIsCatTurn(false);
    setLastState(null);
    if (!isRetry && newLevel === 1) {
      setTutorialStep(1);
    } else if (!isRetry && newLevel === 3) {
      setTutorialStep(4);
    } else if (!isRetry && newLevel === 6) {
      setTutorialStep(5);
    } else {
      setTutorialStep(0);
    }
  }, []);

  useEffect(() => {
    setupLevel(level);
  }, [level, setupLevel]);

  const restartGame = useCallback(() => {
    if (gameState === 'won') {
      setLevel((prev) => prev + 1);
      setCoins((prev) => prev + 50);
    } else {
      setupLevel(level, true);
    }
  }, [gameState, level, setupLevel]);

  // Handle Rescue Ad Auto Progression
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'lost') {
      timer = setTimeout(() => {
        setupLevel(level, true);
      }, 700);
    }
    return () => clearTimeout(timer);
  }, [gameState, level, setupLevel, isAdPlaying]);

  const getNeighborAngle = (c: number, r: number, nc: number, nr: number) => {
    const getX = (col: number, row: number) => col * 48 + (row % 2 !== 0 ? 24 : 0);
    const getY = (row: number) => row * 42;
    const dx = getX(nc, nr) - getX(c, r);
    const dy = getY(nr) - getY(r);
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // Ad Simulation Loop
  useEffect(() => {
    if (isAdPlaying) {
      const interval = setInterval(() => {
        setAdProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setIsAdPlaying(false);
            if (adRewardType === 'coins') {
              setCoins(c => c + 50);
            } else if (adRewardType === 'rewind' && lastState) {
              setCatPos(lastState.catPos);
              setBlocked(lastState.blocked);
              setGameState('playing');
            }
            setAdRewardType(null);
            return 100;
          }
          return p + 25;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isAdPlaying, adRewardType, lastState]);

  const startAd = (type: 'coins' | 'rewind' = 'coins') => {
    setAdRewardType(type);
    setAdProgress(0);
    setIsAdPlaying(true);
  };

  const handleTileClick = useCallback(
    (c: number, r: number) => {
      if (gameState !== 'playing' || tutorialStep > 0 || isCatTurn) return;
      const key = `${c},${r}`;

      // Prevent clicking blocked tiles, obstacles, spills, or the cat
      if (blocked.has(key) || obstacles.has(key) || spills.has(key) || (catPos.c === c && catPos.r === r)) return;
      
      setLastState({ catPos: { ...catPos }, blocked: new Set(blocked) });

      const newBlocked = new Set(blocked);
      newBlocked.add(key);
      setBlocked(newBlocked);

      // Spilled coffee dynamic hazard spread
      if (spills.size > 0) {
        const currentSpillsArray = Array.from(spills).map((s: string) => {
          const parts = s.split(',');
          return { c: parseInt(parts[0]), r: parseInt(parts[1]) };
        });
        const possibleNewSpills: string[] = [];
        for (const sp of currentSpillsArray) {
          const neighbors = getNeighbors(sp.c, sp.r);
          for (const n of neighbors) {
            const nKey = `${n.c},${n.r}`;
            if (!newBlocked.has(nKey) && !obstacles.has(nKey) && !spills.has(nKey) && !cracked.has(nKey) && !(catPos.c === n.c && catPos.r === n.r)) {
              possibleNewSpills.push(nKey);
            }
          }
        }
        if (possibleNewSpills.length > 0) {
          const updatedSpills = new Set(spills);
          const randSpill = possibleNewSpills[Math.floor(Math.random() * possibleNewSpills.length)];
          updatedSpills.add(randSpill);
          setSpills(updatedSpills);
        }
      }

      setIsCatTurn(true);
    },
    [catPos, blocked, obstacles, spills, cracked, gameState, tutorialStep, isCatTurn]
  );

  useEffect(() => {
    if (isCatTurn && gameState === 'playing') {
      const delay = 50;
      const timer = setTimeout(() => {
        const nextCatMove = findCatPath(catPos, blocked, obstacles, spills);

        if (!nextCatMove) {
          setGameState('won');
        } else {
          const currentKey = `${catPos.c},${catPos.r}`;
          if (cracked.has(currentKey)) {
             setBlocked(prev => {
                const b = new Set(prev);
                b.add(currentKey);
                return b;
             });
             setCracked(prev => {
                const c = new Set(prev);
                c.delete(currentKey);
                return c;
             });
          }

          setCatPos(nextCatMove);
          const isPerimeter =
            nextCatMove.c === 0 ||
            nextCatMove.c === GRID_COLS - 1 ||
            nextCatMove.r === 0 ||
            nextCatMove.r === GRID_ROWS - 1;
          
          if (isPerimeter) {
            setEscapeDir({ dx: nextCatMove.c - catPos.c, dy: nextCatMove.r - catPos.r });
            setGameState('lost');
          }
        }
        setIsCatTurn(false);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isCatTurn, catPos, blocked, cracked, obstacles, spills, gameState, level]);

  const visualEdges = React.useMemo(() => {
    const edges = new Set<string>();
    const nodeNeighbors = new Map<string, string[]>();
    
    const allEdges: [string, string][] = [];
    Array.from(blocked).forEach((b1: string) => {
        const [c1, r1] = b1.split(',').map(Number);
        getNeighbors(c1, r1).forEach(n => {
            const b2 = `${n.c},${n.r}`;
            if (blocked.has(b2)) {
                if (b1 < b2) allEdges.push([b1, b2]);
            }
        });
    });
    
    allEdges.sort();

    allEdges.forEach(([u, v]) => {
        const uGroup = nodeNeighbors.get(u) || [];
        const vGroup = nodeNeighbors.get(v) || [];
        const hasCommonConnectedNeighbor = uGroup.some(n => vGroup.includes(n));
        
        if (!hasCommonConnectedNeighbor) {
            edges.add(`${u}-${v}`);
            if (!nodeNeighbors.has(u)) nodeNeighbors.set(u, []);
            if (!nodeNeighbors.has(v)) nodeNeighbors.set(v, []);
            nodeNeighbors.get(u)!.push(v);
            nodeNeighbors.get(v)!.push(u);
        }
    });
    return edges;
  }, [blocked]);

  return (
    <main className={`h-[100dvh] w-full ${zoneTheme.bgClass} flex justify-center overflow-hidden font-sans transition-colors duration-1000 bg-cover bg-center`}
      style={{
        backgroundImage: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%), 
          repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(0,0,0,0.05) 32px, rgba(0,0,0,0.05) 34px),
          repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(0,0,0,0.05) 32px, rgba(0,0,0,0.05) 34px)`
      }}
    >
      <div className={`h-screen max-h-[100dvh] flex flex-col justify-between overflow-hidden px-4 pt-4 pb-0 w-full max-w-[450px] select-none relative ${zoneTheme.panelClass} transition-colors duration-1000`}>
        
        {/* Darkened Overlay for Tutorial */}
        <AnimatePresence>
          {tutorialStep > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-slate-950/75 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <header 
          className={`relative flex-shrink-0 z-10 flex flex-col items-center justify-center px-6 py-4 border-4 rounded-3xl shadow-lg transition-opacity duration-300 ${zoneTheme.headerBg} ${tutorialStep > 0 ? 'opacity-30' : 'opacity-100'}`}
          style={{ backgroundImage: zoneTheme.headerPattern }}
        >
          {/* Hardware Rivets */}
          <div className="absolute top-3 left-4 w-3 h-3 bg-[#475569] rounded-full shadow-inner border border-black/40" />
          <div className="absolute top-3 right-4 w-3 h-3 bg-[#475569] rounded-full shadow-inner border border-black/40" />

          <div className="text-center mb-4">
            <span className={`${zoneTheme.zoneText} font-black tracking-widest text-xs uppercase drop-shadow-sm`}>ZONE: {zoneTheme.name}</span>
            <h1 className={`${zoneTheme.titleText} text-2xl font-black tracking-wide drop-shadow-md mt-1`}>MOCHI'S ESCAPE</h1>
          </div>
          <div className="flex w-full items-center justify-between">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-inner border border-black/10 ${zoneTheme.pillClass}`}>
              <span className="text-xl leading-none">🐟</span>
              <span className={`${zoneTheme.pillText} font-bold text-lg leading-none mt-0.5`}>{coins}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center min-w-[70px]">
                <motion.span 
                  key={level}
                  initial={{ scale: 1.5, color: '#fde047' }}
                  animate={{ scale: 1, color: '#fcf8f2' }}
                  className={`text-sm font-extrabold text-[#fcf8f2] tracking-tight leading-none mt-0.5`}
                >
                  LVL {level}
                </motion.span>
              </div>
              <button
                onClick={() => setupLevel(level, true)}
                disabled={tutorialStep > 0 || isCatTurn}
                className={`p-2 bg-[#fcf8f2] active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-full transition-all shadow-sm`}
              >
                <RotateCcw className={`w-5 h-5 text-[#2e1a0c]`} strokeWidth={3} />
              </button>
            </div>
          </div>
        </header>



        {/* Spacer to push grid up lightly */}
        <div className="flex-1 min-h-[20px] flex flex-col items-center justify-center w-full z-0 pointer-events-none select-none relative">
        </div>

        {/* Game Board */}
        <div className={`flex-shrink-0 flex items-center justify-center w-full z-10 ${tutorialStep > 0 ? 'z-50' : 'z-10'}`}>
          <div className="flex flex-col items-center shrink-0">
            {Array.from({ length: GRID_ROWS }).map((_, r) => {
              
              const isRowHighlighted = tutorialStep > 0 && Array.from({length: GRID_COLS}).some((_, c) => {
                const isCat = catPos.c === c && catPos.r === r;
                const isBlocked = blocked.has(`${c},${r}`);
                const isObstacle = obstacles.has(`${c},${r}`);
                const isSpill = spills.has(`${c},${r}`);
                const isPerimeter = c === 0 || c === GRID_COLS - 1 || r === 0 || r === GRID_ROWS - 1;
                const isTutorialCat = tutorialStep === 1 && isCat;
                const isTutorialBorder = tutorialStep === 2 && isPerimeter;
                const isTutorialNeighbor = tutorialStep === 3 && c === CENTER_C && r === CENTER_R - 1 && !isBlocked;
                const isTutorialObstacle = tutorialStep === 4 && isObstacle;
                const isTutorialSpill = tutorialStep === 5 && isSpill;
                return isTutorialCat || isTutorialBorder || isTutorialNeighbor || isTutorialObstacle || isTutorialSpill;
              });

              return (
                <div
                  key={`row-${r}`}
                  className="flex flex-row justify-center relative w-full"
                  style={{
                    marginTop: r === 0 ? '0' : '-14px',
                    transform: r % 2 !== 0 ? 'translateX(12px)' : 'translateX(-12px)',
                    zIndex: tutorialStep > 0 ? (isRowHighlighted ? 60 : 50) : 10
                  }}
                >
                  {Array.from({ length: GRID_COLS }).map((_, c) => {
                  const isCat = catPos.c === c && catPos.r === r;
                  const isBlocked = blocked.has(`${c},${r}`);
                  const isCracked = cracked.has(`${c},${r}`);
                  const isObstacle = obstacles.has(`${c},${r}`);
                  const isSpill = spills.has(`${c},${r}`);
                  const isPerimeter = c === 0 || c === GRID_COLS - 1 || r === 0 || r === GRID_ROWS - 1;

                  const isTutorialCat = tutorialStep === 1 && isCat;
                  const isTutorialBorder = tutorialStep === 2 && isPerimeter;
                  const isTutorialNeighbor = tutorialStep === 3 && c === CENTER_C && r === CENTER_R - 1 && !isBlocked;
                  const isTutorialObstacle = tutorialStep === 4 && isObstacle;
                  const isTutorialSpill = tutorialStep === 5 && isSpill;
                  
                  const isHighlighted = isTutorialCat || isTutorialBorder || isTutorialNeighbor || isTutorialObstacle || isTutorialSpill;
                  const opacityClass = (tutorialStep > 0 && !isHighlighted) ? 'opacity-30' : 'opacity-100';

                  let catSvgState: 'idle' | 'lost' | 'won' | 'scared' = 'idle';
                  let escapeX = 0;
                  let escapeY = 0;
                  if (isCat) {
                    const isAdjacentToEdge = getNeighbors(catPos.c, catPos.r).some(n => n.c === 0 || n.c === GRID_COLS - 1 || n.r === 0 || n.r === GRID_ROWS - 1);
                    const escapePaths = getCatEscapePathsCount(catPos, blocked, obstacles, spills);
                    
                    if (gameState === 'lost') {
                       catSvgState = 'lost';
                       if (escapeDir) {
                         escapeX = escapeDir.dx * 120;
                         escapeY = escapeDir.dy * 120;
                       } else {
                         if (catPos.c === 0) escapeX = -200;
                         if (catPos.c === GRID_COLS - 1) escapeX = 200;
                         if (catPos.r === 0) escapeY = -200;
                         if (catPos.r === GRID_ROWS - 1) escapeY = 200;
                       }
                    } else if (gameState === 'won') {
                       catSvgState = 'won';
                    } else if (isAdjacentToEdge || escapePaths < 3) {
                       catSvgState = 'scared';
                    }
                  }

                  return (
                    <div
                      key={`${c},${r}`}
                      className={`relative w-[48px] h-[56px] group transition-opacity duration-300 ${opacityClass}`}
                      style={{ zIndex: isHighlighted ? 50 : 10 }}
                      onClick={() => handleTileClick(c, r)}
                    >
                      {isTutorialBorder && (
                         <div className="absolute -inset-[3px] bg-rose-500 animate-pulse clip-hex z-[-1]" />
                      )}
                      {isTutorialNeighbor && (
                         <div className="absolute -inset-[3px] bg-[#22d3ee] animate-pulse clip-hex z-[-1]" />
                      )}

                      <>
                          {/* 3D Base layer for shadow effect */}
                          <div
                            className={`absolute top-[4px] left-0 w-full h-full clip-hex transition-colors duration-200 bg-black/20`}
                          />
                          {/* Top tactile tile layer */}
                          <motion.div
                            className={`relative w-full h-full clip-hex flex items-center justify-center transition-all duration-200 ${!isBlocked && !isObstacle ? 'cursor-pointer' : ''} ${zoneTheme.nodeBorder.replace('border-', 'bg-')}`}
                            initial={false}
                            animate={{ y: 0 }}
                            whileTap={gameState === 'playing' && tutorialStep === 0 && !isObstacle && !isBlocked ? { y: 2, scale: 0.95 } : {}}
                          >
                            <div className={`absolute inset-[1.5px] clip-hex transition-colors ${zoneTheme.nodeClass} ${!isBlocked && !isObstacle ? zoneTheme.nodeHover : ''}`} />
                            
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                              {isCracked && (
                                 <Zap className="w-4 h-4 fill-rose-500/20 text-rose-500/50 absolute z-0" />
                              )}
                              {isObstacle && (
                                 <span className="text-[24px] filter drop-shadow-md opacity-100 mix-blend-normal" style={{ transform: 'translateY(-1px)' }}>
                                    {level <= 5 ? ['🐮', '🐷', '🐑', '🐔', '🐴'][(c * 7 + r * 13) % 5] : zoneTheme.obstacle}
                                 </span>
                              )}
                              {isSpill && (
                                 <div className="absolute inset-[10%] rounded-full bg-purple-900/30 animate-pulse blur-[1px]" style={{ backgroundColor: 'rgba(107, 70, 48, 0.4)' }} />
                              )}
                            </div>
                          </motion.div>
                      </>
                      {isBlocked && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                          {(() => {
                            const b1 = `${c},${r}`;
                            const blockedNeighbors = getNeighbors(c, r).filter(n => {
                                const b2 = `${n.c},${n.r}`;
                                const edgeId = b1 < b2 ? `${b1}-${b2}` : `${b2}-${b1}`;
                                return visualEdges.has(edgeId);
                            });
                            if (blockedNeighbors.length === 0) {
                              return (
                                <div className={`absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[40px] h-[14px] ${zoneTheme.fenceClass} rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)] border-b-2 border-black/30 flex items-center justify-center overflow-hidden`}>
                                   <div className="text-[10px] opacity-40 mix-blend-overlay w-[20px] whitespace-nowrap">{zoneTheme.obstacle.repeat(5)}</div>
                                </div>
                              );
                            }
                            return (
                              <>
                                {blockedNeighbors.map(n => {
                                  const angle = getNeighborAngle(c, r, n.c, n.r);
                                  return (
                                    <div 
                                      key={`${n.c},${n.r}`}
                                      className={`absolute top-1/2 left-1/2 -mt-[6px] h-[12px] ${zoneTheme.fenceClass} shadow-[0_4px_6px_rgba(0,0,0,0.6)] border-b-2 border-black/30 origin-left flex items-center overflow-hidden z-20`}
                                      style={{ 
                                        width: '24px', 
                                        transform: `rotate(${angle}deg)` 
                                      }}
                                    >
                                    </div>
                                  );
                                })}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[14px] h-[14px] ${zoneTheme.fenceClass} rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.6)] border-b-2 border-black/30 z-30 flex items-center justify-center overflow-hidden`}>
                                  <span className="text-[10px] opacity-40 mix-blend-overlay">{zoneTheme.obstacle}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {isCat && (
                        <motion.div 
                          layoutId="cat"
                          transition={gameState === 'lost' ? { duration: 0.5, ease: "easeIn" } : { type: 'spring', stiffness: 350, damping: 25 }}
                          animate={gameState === 'lost' ? { x: escapeX, y: escapeY, opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
                          className="absolute inset-0 z-30 flex items-center justify-center drop-shadow-sm pointer-events-none"
                        >
                          <div style={{ transform: 'translateY(-2px)' }}>
                             <PixelCat state={catSvgState} animationPhase={catAnimationPhase} skin={currentSkin} className="w-[52px] h-[52px]" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className={`w-full flex items-center justify-between px-6 pb-8 pt-2 gap-4 flex-shrink-0 relative z-10 transition-opacity duration-300 ${tutorialStep > 0 ? 'opacity-30' : 'opacity-100'}`}>
          <button onClick={() => setIsShopOpen(true)} disabled={tutorialStep > 0} className="w-16 h-16 bg-amber-500 border-amber-700 flex flex-col items-center justify-center rounded-2xl border-b-4 active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 shrink-0 shadow-lg">
            <ShoppingBag className="w-7 h-7 text-white" strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => {
               if (tutorialStep > 0 || !lastState || gameState !== 'playing') return;
               if (coins >= 50) { 
                 setCoins(c => c - 50); 
                 setCatPos(lastState.catPos);
                 setBlocked(lastState.blocked);
                 setLastState(null);
               } else {
                 startAd('rewind');
               }
            }}
            disabled={tutorialStep > 0 || !lastState || gameState !== 'playing'} 
            className="flex-1 h-16 bg-emerald-500 border-emerald-700 text-white flex flex-col items-center justify-center font-bold tracking-wide rounded-2xl border-b-4 active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 shadow-lg font-sans"
          >
            <span className="text-sm font-black uppercase tracking-wide">UNDO</span>
            <div className="bg-emerald-600 px-2 py-0.5 rounded-full text-[10px] flex items-center justify-center gap-1 mt-0.5 font-bold shadow-inner">
              <span>{coins >= 50 ? '-50' : 'Watch Ad'}</span>
              <span>🐟</span>
            </div>
          </button>

          <button onClick={() => setIsSettingsOpen(true)} disabled={tutorialStep > 0} className="w-16 h-16 bg-slate-600 border-slate-800 flex flex-col items-center justify-center rounded-2xl border-b-4 active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 shrink-0 shadow-lg">
            <Settings className="w-7 h-7 text-white" strokeWidth={2.5} />
          </button>
        </footer>

        {/* Tutorial Tooltip */}
        <AnimatePresence>
          {tutorialStep > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute inset-x-4 top-4 z-[100] flex justify-center pointer-events-none"
            >
              <div 
                className="bg-[#2e1a0c] border-4 border-[#fcf8f2] shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-3xl p-6 relative pointer-events-auto flex flex-col w-full"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 12px)' }}
              >
                
                <p className="text-[#fcf8f2] text-[15px] font-bold leading-relaxed text-center mb-6 drop-shadow-sm">
                  {tutorialStep === 1 && "This is Mochi. He wants to escape the grid!"}
                  {tutorialStep === 2 && "If he reaches the edge, he's gone! Tap empty spots to build fences."}
                  {tutorialStep === 3 && "Trap him to win! Beating levels unlocks new zones with trickier mechanics."}
                  {tutorialStep === 4 && "Watch out! These obstacles block you from building fences, but Mochi can jump right over them!"}
                  {tutorialStep === 5 && "Oh no, spilled coffee! It grows every turn you take, and neither you nor Mochi can cross it."}
                </p>
                <div className="flex gap-3 justify-center">
                   <button 
                     onClick={() => {
                        if (tutorialStep === 3 || tutorialStep === 4 || tutorialStep === 5) {
                           setTutorialStep(0);
                        } else {
                           setTutorialStep(s => s + 1);
                        }
                     }}
                     className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_0_#92400e] active:shadow-[0_0px_0_0_#92400e] active:translate-y-[4px] transition-all"
                   >
                     {tutorialStep === 3 ? 'Start Level 1' : (tutorialStep === 4 || tutorialStep === 5 ? 'Got it!' : 'Next')}
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty placeholder for AnimatePresence just to keep structure clean, or simply removed */}

        <AnimatePresence>
          {gameState === 'won' && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-50"
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {STARS.map((star, i) => (
                  <motion.div 
                     key={i} 
                     initial={{ y: -50, x: star.left * 10, rotate: 0, opacity: 1 }}
                     animate={{ y: 800, x: star.left * 10 + star.distance - 50, rotate: 360, opacity: 0 }}
                     transition={{ 
                       duration: 2 + (i % 3), 
                       delay: star.delay * 2, 
                       repeat: Infinity, 
                       ease: "linear" 
                     }}
                     className="absolute w-3 h-3 rounded-sm shadow-sm"
                     style={{
                       left: `${star.left}%`,
                       backgroundColor: ['#fde047', '#f97316', '#ec4899', '#3b82f6'][i%4]
                     }}
                  />
                ))}
              </div>

              <motion.h1 
                initial={{ scale: 0, opacity: 0 }} 
                animate={{ scale: 1.1, opacity: 1, y: [0, -10, 0] }}
                transition={{ type: 'tween', ease: 'easeOut', duration: 0.6 }}
                className="text-5xl font-black text-[#fcf8f2] drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] tracking-wider uppercase z-10"
              >
                CAUGHT!
              </motion.h1>
              
              <motion.div
                 initial={{ y: 50, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.2 }}
                 className="bg-white/10 border border-white/20 px-8 py-3 rounded-full flex items-center gap-3 my-6 shadow-xl backdrop-blur-md z-10"
              >
                 <span className="w-8 h-8 flex items-center justify-center text-3xl animate-pulse">🐟</span>
                 <span className="text-amber-300 text-3xl font-black">+50</span>
              </motion.div>
              
              <motion.button 
                 initial={{ y: 50, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.3 }}
                 onClick={restartGame}
                 className="w-56 h-14 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-xl font-black tracking-wide rounded-2xl border-b-4 border-orange-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-lg shadow-orange-500/20 z-10"
              >
                 CONTINUE
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAdPlaying && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`absolute inset-0 z-[100] ${zoneTheme.bgClass}/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center`}
            >
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6" />
              <h3 className={`text-xl font-black ${zoneTheme.textClass} mb-2`}>Ad Experience...</h3>
              <p className={`text-sm ${zoneTheme.accentClass} opacity-80 font-medium mb-6`}>Support development for a few seconds.</p>
              <div className={`w-full max-w-sm h-3 ${zoneTheme.nodeClass} rounded-full overflow-hidden border ${zoneTheme.nodeBorder}`}>
                 <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${adProgress}%` }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isShopOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className={`absolute inset-0 z-[100] ${zoneTheme.bgClass}/95 backdrop-blur-md flex flex-col p-6`}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-2xl font-black ${zoneTheme.textClass}`}>Mochi's Friends</h3>
                <button onClick={() => setIsShopOpen(false)} className={`p-2 bg-white/5 rounded-full ${zoneTheme.textClass} hover:bg-white/10 transition-colors`}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className={`flex items-center justify-center gap-2 ${zoneTheme.panelClass} py-3 rounded-2xl mb-6 border ${zoneTheme.nodeBorder} shadow-inner`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none drop-shadow-sm">🐟</span>
                  <span className={`${zoneTheme.accentClass} font-bold text-lg`}>{coins} Treats</span>
                </div>
                <button
                  onClick={() => {
                    setIsShopOpen(false);
                    startAd('coins');
                  }}
                  className={`bg-white/5 ${zoneTheme.textClass} px-3 py-1.5 rounded-xl border ${zoneTheme.nodeBorder} font-bold text-xs flex items-center gap-1.5 hover:bg-white/10 transition-colors ml-4`}
                >
                  📺 +50
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-8">
                {SKINS.map((skin) => {
                  const isOwned = purchasedSkins.has(skin.id);
                  const isEquipped = currentSkin === skin.id;
                  const canAfford = coins >= skin.price;

                  return (
                    <button
                      key={skin.id}
                      onClick={() => {
                        if (isOwned) {
                          setCurrentSkin(skin.id);
                        } else if (canAfford) {
                          setCoins(c => c - skin.price);
                          setPurchasedSkins(prev => new Set(prev).add(skin.id));
                          setCurrentSkin(skin.id);
                        }
                      }}
                      disabled={!isOwned && !canAfford}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${
                        isEquipped 
                          ? `bg-slate-700 border-white outline outline-2 outline-offset-2 outline-white shadow-xl`
                          : isOwned 
                            ? `bg-slate-800 border-slate-600 hover:border-slate-400 shadow-md`
                            : `bg-slate-900 border-dashed border-slate-700 opacity-60`
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-center mt-2 w-16 h-16">
                         <PixelCat state="idle" animationPhase="stand" skin={skin.id} className="w-[60px] h-[60px]" />
                      </div>
                      <span className={`text-sm font-bold text-white mb-1`}>{skin.name}</span>
                      
                      {!isOwned ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs leading-none opacity-80">🐟</span>
                          <span className={`text-xs font-black ${canAfford ? zoneTheme.accentClass : 'text-slate-500'}`}>
                            {skin.price}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-xs font-black mt-1 ${isEquipped ? zoneTheme.accentClass : 'text-slate-500'}`}>
                          {isEquipped ? 'EQUIPPED' : 'OWNED'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`absolute inset-x-4 top-24 z-[100] ${zoneTheme.panelClass} border ${zoneTheme.nodeBorder} shadow-2xl rounded-[32px] p-6`}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-2xl font-black ${zoneTheme.textClass}`}>Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className={`p-2 bg-white/5 rounded-full ${zoneTheme.textClass} hover:bg-white/10 transition-colors`}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 bg-black/20 rounded-2xl border ${zoneTheme.nodeBorder}`}>
                  <div>
                    <h4 className={`${zoneTheme.textClass} font-bold`}>Sound Effects</h4>
                    <p className={`text-xs ${zoneTheme.accentClass} mt-1 opacity-70`}>Meows and pops</p>
                  </div>
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className={`flex items-center justify-between p-4 bg-black/20 rounded-2xl border ${zoneTheme.nodeBorder}`}>
                  <div>
                    <h4 className={`${zoneTheme.textClass} font-bold`}>Haptics</h4>
                    <p className={`text-xs ${zoneTheme.accentClass} mt-1 opacity-70`}>Vibration feedback</p>
                  </div>
                  <button 
                    onClick={() => setHapticsEnabled(!hapticsEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${hapticsEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${hapticsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className={`flex flex-col gap-2 p-4 bg-black/20 rounded-2xl border ${zoneTheme.nodeBorder}`}>
                  <h4 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Admin Tools</h4>
                  <div className="flex gap-2">
                    <button onClick={() => setLevel(Math.max(1, level - 25))} className={`flex-1 bg-white/5 ${zoneTheme.textClass} rounded-xl border ${zoneTheme.nodeBorder} py-2 text-sm font-bold opacity-80 hover:opacity-100`}>Prev Zone</button>
                    <button onClick={() => setLevel(level + 25)} className={`flex-1 bg-white/5 ${zoneTheme.textClass} rounded-xl border ${zoneTheme.nodeBorder} py-2 text-sm font-bold opacity-80 hover:opacity-100`}>Next Zone</button>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-4 bg-black/20 rounded-2xl border ${zoneTheme.nodeBorder}`}>
                  <div>
                    <h4 className="text-rose-400 font-bold">Progress Reset</h4>
                    <p className={`text-xs ${zoneTheme.accentClass} mt-1 opacity-70`}>Lose all treats and friends</p>
                  </div>
                  <button 
                    onClick={() => {
                       setLevel(1);
                       setCoins(200);
                       setPurchasedSkins(new Set(['mochi']));
                       setCurrentSkin('mochi');
                       setTutorialStep(1);
                       setIsSettingsOpen(false);
                    }}
                    className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-sm font-bold rounded-xl transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isSettingsOpen && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className={`absolute inset-0 z-[90] ${zoneTheme.bgClass}/80 backdrop-blur-sm`}
               onClick={() => setIsSettingsOpen(false)}
            />
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
