import { useState, useEffect, useCallback } from 'react';
import {
  Board,
  Player,
  Position,
  createInitialBoard,
  makeMove,
  getValidMoves,
  getFlips,
  countPieces,
  isGameOver,
  getWinner,
  getAIMove,
} from './game';

type GameMode = 'pvp' | 'pve';
type Difficulty = 'easy' | 'medium' | 'hard';

function Cell({
  row,
  col,
  cell,
  isValid,
  isLastMove,
  onClick,
}: {
  row: number;
  col: number;
  cell: 'black' | 'white' | null;
  isValid: boolean;
  isLastMove: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`
        relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
        border border-green-800/30
        flex items-center justify-center
        cursor-pointer transition-all duration-150
        ${isValid ? 'bg-green-600/40 hover:bg-green-500/50' : 'bg-green-700/20'}
        ${isLastMove ? 'ring-2 ring-yellow-400/70' : ''}
      `}
      onClick={onClick}
    >
      {cell && (
        <div
          className={`
            w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full
            shadow-lg transition-all duration-300
            ${cell === 'black'
              ? 'bg-gradient-to-br from-gray-800 to-black shadow-black/50'
              : 'bg-gradient-to-br from-white to-gray-200 shadow-white/50 border border-gray-300'
            }
            ${isLastMove ? 'scale-105' : ''}
          `}
        />
      )}
      {isValid && !cell && (
        <div className="w-3 h-3 rounded-full bg-green-300/60 animate-pulse" />
      )}
    </div>
  );
}

function ScoreBoard({ scores, currentPlayer, gameOver }: { scores: { black: number; white: number }; currentPlayer: Player; gameOver: boolean }) {
  return (
    <div className="flex items-center gap-4 sm:gap-8">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${currentPlayer === 'black' && !gameOver ? 'bg-gray-800 text-white scale-105 shadow-lg' : 'bg-gray-100 text-gray-700'}`}>
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-md" />
        <span className="font-bold text-lg">{scores.black}</span>
      </div>
      <div className="text-gray-500 font-medium">VS</div>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${currentPlayer === 'white' && !gameOver ? 'bg-white text-gray-800 scale-105 shadow-lg border-2 border-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-200 shadow-md border border-gray-300" />
        <span className="font-bold text-lg">{scores.white}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameOver, setGameOver] = useState(false);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [history, setHistory] = useState<{ board: Board; player: Player }[]>([]);

  const scores = countPieces(board);
  const validMoves = getValidMoves(board, currentPlayer);

  const checkGameState = useCallback((newBoard: Board, nextPlayer: Player) => {
    if (isGameOver(newBoard)) {
      setGameOver(true);
      return;
    }
    const nextMoves = getValidMoves(newBoard, nextPlayer);
    if (nextMoves.length === 0) {
      // 当前玩家无法下棋，跳过
      const afterSkip = getOpponent(nextPlayer);
      const skipMoves = getValidMoves(newBoard, afterSkip);
      if (skipMoves.length === 0) {
        setGameOver(true);
      } else {
        setCurrentPlayer(afterSkip);
      }
    } else {
      setCurrentPlayer(nextPlayer);
    }
  }, []);

  function getOpponent(player: Player): Player {
    return player === 'black' ? 'white' : 'black';
  }

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameOver || aiThinking) return;
    if (gameMode === 'pve' && currentPlayer === 'white') return;

    const flips = getFlips(board, row, col, currentPlayer);
    if (flips.length === 0) return;

    const newBoard = makeMove(board, row, col, currentPlayer);
    setHistory(prev => [...prev, { board, player: currentPlayer }]);
    setBoard(newBoard);
    setLastMove({ row, col });

    const nextPlayer = getOpponent(currentPlayer);
    checkGameState(newBoard, nextPlayer);
  }, [board, currentPlayer, gameOver, aiThinking, gameMode, checkGameState]);

  // AI 下棋
  useEffect(() => {
    if (gameMode !== 'pve' || currentPlayer !== 'white' || gameOver) return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = getAIMove(board, 'white', difficulty);
      if (move) {
        const newBoard = makeMove(board, move.row, move.col, 'white');
        setHistory(prev => [...prev, { board, player: 'white' }]);
        setBoard(newBoard);
        setLastMove(move);
        checkGameState(newBoard, 'black');
      }
      setAiThinking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPlayer, gameMode, gameOver, board, difficulty, checkGameState]);

  const handleRestart = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer('black');
    setGameOver(false);
    setLastMove(null);
    setAiThinking(false);
    setHistory([]);
  };

  const handleUndo = () => {
    if (history.length === 0 || aiThinking) return;
    if (gameMode === 'pve') {
      // 人机模式撤销两步
      const stepsBack = history.length >= 2 ? 2 : 1;
      const target = history[history.length - stepsBack];
      setBoard(target.board);
      setCurrentPlayer(target.player);
      setHistory(prev => prev.slice(0, -stepsBack));
      setGameOver(false);
    } else {
      const target = history[history.length - 1];
      setBoard(target.board);
      setCurrentPlayer(target.player);
      setHistory(prev => prev.slice(0, -1));
      setGameOver(false);
    }
    setLastMove(null);
  };

  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setShowMenu(false);
    handleRestart();
  };

  const winner = getWinner(board);

  if (showMenu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 sm:p-12 max-w-md w-full text-center shadow-2xl border border-white/20">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">黑白棋</h1>
          <p className="text-green-200 mb-8 text-lg">Othello / Reversi</p>
          
          <div className="space-y-4">
            <button
              onClick={() => startGame('pve')}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🤖 人机对战
            </button>
            <button
              onClick={() => startGame('pvp')}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              👥 人人对战
            </button>
          </div>

          <div className="mt-8 text-left text-green-200 text-sm space-y-2">
            <p className="font-semibold text-white text-base mb-3">📖 游戏规则：</p>
            <p>• 黑棋先手，双方轮流落子</p>
            <p>• 落子必须能翻转对方的棋子</p>
            <p>• 在横、竖、斜方向上夹住对方棋子即可翻转</p>
            <p>• 无法落子时跳过，双方都无法落子则游戏结束</p>
            <p>• 棋子多的一方获胜</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-4 gap-4">
      {/* 顶部信息栏 */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">黑白棋</h1>
        <ScoreBoard scores={scores} currentPlayer={currentPlayer} gameOver={gameOver} />
      </div>

      {/* 状态提示 */}
      <div className="h-8 flex items-center">
        {gameOver ? (
          <div className="text-xl font-bold text-yellow-300 animate-bounce">
            {winner === 'draw' ? '🤝 平局！' : winner === 'black' ? '⚫ 黑棋获胜！' : '⚪ 白棋获胜！'}
          </div>
        ) : aiThinking ? (
          <div className="text-lg text-green-200 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            AI 思考中...
          </div>
        ) : (
          <div className="text-lg text-green-200">
            {currentPlayer === 'black' ? '⚫' : '⚪'} {gameMode === 'pve' && currentPlayer === 'white' ? 'AI' : ''}
            {' '}回合
            {validMoves.length === 0 ? '' : ` · 可下 ${validMoves.length} 处`}
          </div>
        )}
      </div>

      {/* 棋盘 */}
      <div className="bg-green-800 p-2 sm:p-3 rounded-xl shadow-2xl border-4 border-green-950">
        <div className="grid grid-cols-8 gap-0">
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <Cell
                key={`${rowIdx}-${colIdx}`}
                row={rowIdx}
                col={colIdx}
                cell={cell}
                isValid={!gameOver && !aiThinking && validMoves.some(m => m.row === rowIdx && m.col === colIdx)}
                isLastMove={lastMove?.row === rowIdx && lastMove?.col === colIdx}
                onClick={() => handleCellClick(rowIdx, colIdx)}
              />
            ))
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        <button
          onClick={handleRestart}
          className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          🔄 重新开始
        </button>
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || aiThinking}
          className="px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          ↩️ 悔棋
        </button>
        {gameMode === 'pve' && (
          <div className="flex items-center gap-2">
            <span className="text-green-200 text-sm">难度:</span>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); handleRestart(); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  difficulty === d
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/20 text-green-200 hover:bg-white/30'
                }`}
              >
                {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowMenu(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          🏠 主菜单
        </button>
      </div>
    </div>
  );
}
