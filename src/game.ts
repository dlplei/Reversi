// 黑白棋游戏逻辑

export type CellState = 'black' | 'white' | null;
export type Board = CellState[][];
export type Player = 'black' | 'white';
export type Position = { row: number; col: number };

export const BOARD_SIZE = 8;

// 8个方向
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function createInitialBoard(): Board {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  // 初始四个棋子
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

// 获取某个方向上被翻转的棋子
function getFlipsInDirection(
  board: Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  player: Player
): Position[] {
  const opponent = getOpponent(player);
  const flips: Position[] = [];
  let r = row + dRow;
  let c = col + dCol;

  while (isInBounds(r, c) && board[r][c] === opponent) {
    flips.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }

  // 如果最后是自己的棋子，则中间的全部翻转
  if (isInBounds(r, c) && board[r][c] === player && flips.length > 0) {
    return flips;
  }
  return [];
}

// 获取落子后所有被翻转的棋子
export function getFlips(board: Board, row: number, col: number, player: Player): Position[] {
  if (board[row][col] !== null) return [];

  const allFlips: Position[] = [];
  for (const [dRow, dCol] of DIRECTIONS) {
    allFlips.push(...getFlipsInDirection(board, row, col, dRow, dCol, player));
  }
  return allFlips;
}

// 检查是否可以落子
export function isValidMove(board: Board, row: number, col: number, player: Player): boolean {
  return getFlips(board, row, col, player).length > 0;
}

// 获取所有合法落子位置
export function getValidMoves(board: Board, player: Player): Position[] {
  const moves: Position[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isValidMove(board, row, col, player)) {
        moves.push({ row, col });
      }
    }
  }
  return moves;
}

// 执行落子
export function makeMove(board: Board, row: number, col: number, player: Player): Board {
  const flips = getFlips(board, row, col, player);
  if (flips.length === 0) return board;

  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  for (const { row: r, col: c } of flips) {
    newBoard[r][c] = player;
  }
  return newBoard;
}

// 计算分数
export function countPieces(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 'black') black++;
      else if (board[row][col] === 'white') white++;
    }
  }
  return { black, white };
}

// 检查游戏是否结束
export function isGameOver(board: Board): boolean {
  return getValidMoves(board, 'black').length === 0 && getValidMoves(board, 'white').length === 0;
}

// 获取获胜者
export function getWinner(board: Board): Player | 'draw' | null {
  if (!isGameOver(board)) return null;
  const { black, white } = countPieces(board);
  if (black > white) return 'black';
  if (white > black) return 'white';
  return 'draw';
}

// ============ AI 逻辑 ============

// 位置权重表（角和边更重要）
const POSITION_WEIGHTS = [
  [100, -20,  10,   5,   5,  10, -20, 100],
  [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
  [ 10,  -2,   5,   1,   1,   5,  -2,  10],
  [  5,  -2,   1,   0,   0,   1,  -2,   5],
  [  5,  -2,   1,   0,   0,   1,  -2,   5],
  [ 10,  -2,   5,   1,   1,   5,  -2,  10],
  [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
  [100, -20,  10,   5,   5,  10, -20, 100],
];

function evaluateBoard(board: Board, player: Player): number {
  const opponent = getOpponent(player);
  let score = 0;
  const { black, white } = countPieces(board);
  const totalPieces = black + white;

  // 位置权重
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === player) {
        score += POSITION_WEIGHTS[row][col];
      } else if (board[row][col] === opponent) {
        score -= POSITION_WEIGHTS[row][col];
      }
    }
  }

  // 行动力（可下位置数）
  const myMoves = getValidMoves(board, player).length;
  const oppMoves = getValidMoves(board, opponent).length;
  score += (myMoves - oppMoves) * 5;

  // 棋子数（游戏后期更重要）
  if (totalPieces > 50) {
    const myPieces = player === 'black' ? black : white;
    const oppPieces = player === 'black' ? white : black;
    score += (myPieces - oppPieces) * 3;
  }

  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player
): number {
  const currentPlayer = maximizing ? aiPlayer : getOpponent(aiPlayer);

  if (depth === 0 || isGameOver(board)) {
    return evaluateBoard(board, aiPlayer);
  }

  const moves = getValidMoves(board, currentPlayer);

  if (moves.length === 0) {
    // 当前玩家无法下棋，跳过
    return minimax(board, depth - 1, alpha, beta, !maximizing, aiPlayer);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.row, move.col, currentPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.row, move.col, currentPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getAIMove(board: Board, player: Player, difficulty: 'easy' | 'medium' | 'hard'): Position | null {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    // 简单AI：随机选择
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'medium' ? 3 : 5;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const newBoard = makeMove(board, move.row, move.col, player);
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, player);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
