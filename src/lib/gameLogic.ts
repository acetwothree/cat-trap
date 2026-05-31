export class PRNG {
  seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export type Point = { c: number; r: number };
export const GRID_COLS = 7;
export const GRID_ROWS = 9;
export const CENTER_C = Math.floor(GRID_COLS / 2);
export const CENTER_R = Math.floor(GRID_ROWS / 2);

export function getNeighbors(c: number, r: number): Point[] {
  const isOdd = r % 2 !== 0;
  const dirs = isOdd
    ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
    : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];

  return dirs
    .map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
    .filter((pt) => pt.c >= 0 && pt.c < GRID_COLS && pt.r >= 0 && pt.r < GRID_ROWS);
}

export function findCatPath(catPos: Point, blocked: Set<string>, obstacles: Set<string>, spills: Set<string>): Point | null {
  const isEdge = (p: Point) => p.c === 0 || p.c === GRID_COLS - 1 || p.r === 0 || p.r === GRID_ROWS - 1;

  if (isEdge(catPos)) {
    return catPos; // Already on edge
  }

  const queue: Point[][] = [[catPos]];
  const visited = new Set<string>();
  visited.add(`${catPos.c},${catPos.r}`);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const curr = path[path.length - 1];

    if (isEdge(curr)) {
      return path[1]; // Return first step
    }

    const neighbors = getNeighbors(curr.c, curr.r);
    // Removed random sort to make cat movement purely deterministic based on BFS order

    for (const n of neighbors) {
      const key = `${n.c},${n.r}`;
      if (!visited.has(key) && !blocked.has(key) && !obstacles.has(key) && !spills.has(key)) {
        visited.add(key);
        queue.push([...path, n]);
      }
    }
  }
  return null;
}

export function getCatEscapePathsCount(catPos: Point, blocked: Set<string>, obstacles: Set<string>, spills: Set<string>): number {
  if (catPos.c === 0 || catPos.c === GRID_COLS - 1 || catPos.r === 0 || catPos.r === GRID_ROWS - 1) return 1;

  const queue: Point[] = [catPos];
  const visited = new Set<string>();
  visited.add(`${catPos.c},${catPos.r}`);
  let edgeCount = 0;

  while(queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.c === 0 || curr.c === GRID_COLS - 1 || curr.r === 0 || curr.r === GRID_ROWS - 1) {
      edgeCount++;
    }
    const neighbors = getNeighbors(curr.c, curr.r);
    for (const n of neighbors) {
      const key = `${n.c},${n.r}`;
      if (!visited.has(key) && !blocked.has(key) && !obstacles.has(key) && !spills.has(key)) {
        visited.add(key);
        queue.push(n);
      }
    }
  }
  return edgeCount;
}

export function generateBoard(level: number): { blocked: Set<string>; cracked: Set<string>; obstacles: Set<string>; spills: Set<string> } {
  const rng = new PRNG(level * 12345);

  while (true) {
    const blocked = new Set<string>();
    const cracked = new Set<string>();
    const obstacles = new Set<string>();
    const spills = new Set<string>();

    let count = 0;
    if (level === 1) count = 32;
    else if (level >= 2 && level <= 5) count = Math.floor(rng.next() * 5) + 26;
    else count = 10;
    
    let crackedCount = 0; // Removed lightning tiles for now
    let obstacleCount = 0; // Keep 0 for now as per previous changes
    let spillCount = level >= 6 ? Math.floor(rng.next() * 2) + 1 : 0;

    let attempts = 0;
    while (blocked.size < count && attempts < 1000) {
      attempts++;
      const c = Math.floor(rng.next() * GRID_COLS);
      const r = Math.floor(rng.next() * GRID_ROWS);
      if (c >= CENTER_C - 1 && c <= CENTER_C + 1 && r >= CENTER_R - 1 && r <= CENTER_R + 1) continue; // Keep center clear
      
      const key = `${c},${r}`;
      if (blocked.has(key)) continue;
      
      // Prevent placing if it touches existing blocks (avoid clusters)
      const initialNeighbors = getNeighbors(c, r).filter(n => blocked.has(`${n.c},${n.r}`));
      if (initialNeighbors.length > 0) continue;
      
      blocked.add(key);
      
      const isLeft = c < CENTER_C - 1;
      const isRight = c >= GRID_COLS - (CENTER_C - 1);
      const isTop = r < CENTER_R - 1;
      const isBottom = r >= GRID_ROWS - (CENTER_R - 1);
      
      let mode = 'horizontal';
      if ((isLeft && isTop) || (isRight && isBottom)) mode = 'diag1';
      else if ((isLeft && isBottom) || (isRight && isTop)) mode = 'diag2';
      else if (isLeft || isRight) mode = 'vertical';
      else mode = 'horizontal';
      
      let cur = { c, r };
      let len = Math.floor(rng.next() * 3) + 1; // Add 1 to 3 more blocks in line
      for (let i = 0; i < len; i++) {
         if (blocked.size >= count) break;
         let isOdd = cur.r % 2 !== 0;
         let nextC = cur.c;
         let nextR = cur.r;
         
         if (mode === 'horizontal') {
            nextC += 1;
         } else if (mode === 'vertical') {
            nextR += 1;
         } else if (mode === 'diag1') { 
            nextC += (isOdd ? 1 : 0);
            nextR += 1;
         } else if (mode === 'diag2') {
            nextC += (isOdd ? 0 : -1);
            nextR += 1;
         }
         
         if (nextC >= 0 && nextC < GRID_COLS && nextR >= 0 && nextR < GRID_ROWS && (nextC < CENTER_C - 1 || nextC > CENTER_C + 1 || nextR < CENTER_R - 1 || nextR > CENTER_R + 1)) {
             // Check if next connects to anything OTHER than cur
             const nextNeighbors = getNeighbors(nextC, nextR).filter(n => blocked.has(`${n.c},${n.r}`));
             if (nextNeighbors.length > 1 || (nextNeighbors.length === 1 && (nextNeighbors[0].c !== cur.c || nextNeighbors[0].r !== cur.r))) {
                 break;
             }
             blocked.add(`${nextC},${nextR}`);
             cur = { c: nextC, r: nextR };
         } else {
             break;
         }
      }
    }

    while (cracked.size < crackedCount) {
      const c = Math.floor(rng.next() * GRID_COLS);
      const r = Math.floor(rng.next() * GRID_ROWS);
      const key = `${c},${r}`;
      if (c === CENTER_C && r === CENTER_R) continue;
      if (!blocked.has(key)) {
        cracked.add(key);
      }
    }
    
    let obsAttempts = 0;
    while (obstacles.size < obstacleCount && obsAttempts < 100) {
      obsAttempts++;
      const c = Math.floor(rng.next() * GRID_COLS);
      const r = Math.floor(rng.next() * GRID_ROWS);
      const key = `${c},${r}`;
      if (c === CENTER_C && r === CENTER_R) continue;
      if (!blocked.has(key) && !cracked.has(key)) {
        // Also don't place on perimeter to ensure escape paths aren't tricky, maybe just inside
        if (c > 1 && c < GRID_COLS - 2 && r > 1 && r < GRID_ROWS - 2) {
          obstacles.add(key);
        }
      }
    }

    let spillAttempts = 0;
    while (spills.size < spillCount && spillAttempts < 100) {
      spillAttempts++;
      const c = Math.floor(rng.next() * GRID_COLS);
      const r = Math.floor(rng.next() * GRID_ROWS);
      const key = `${c},${r}`;
      if (c === CENTER_C && r === CENTER_R) continue;
      if (!blocked.has(key) && !cracked.has(key) && !obstacles.has(key)) {
        if (c > 1 && c < GRID_COLS - 2 && r > 1 && r < GRID_ROWS - 2) {
          spills.add(key);
        }
      }
    }

    if (findCatPath({ c: CENTER_C, r: CENTER_R }, blocked, obstacles, spills)) {
      return { blocked, cracked, obstacles, spills };
    }
  }
}
