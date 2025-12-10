// File: `App.js`
import React, { useState, useEffect } from 'react';
import { RefreshCw, Lightbulb, X as IconX, Circle as IconCircle } from 'lucide-react';

export default function App() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('playing');
  const [promoCode, setPromoCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const API_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim())
    ? import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')
    : 'https://tic-tac-toe-production-2050.up.railway.app';
  // флаг включения подсказки для игрока (X)
  const [highlightWin, setHighlightWin] = useState(true);

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // заранее выбранная выигрышная комбинация для X (показывается при включенной подсказке)
  const [targetWinCombo, setTargetWinCombo] = useState(() => {
    return winningCombinations[Math.floor(Math.random() * winningCombinations.length)];
  });

  const checkWinner = (squares) => {
    for (let combo of winningCombinations) {
      const [a, b, c] = combo;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const isBoardFull = (squares) => squares.every(square => square !== null);

  const generatePromoCode = () => Math.floor(10000 + Math.random() * 90000).toString();

  const sendGameResult = async (result, promoCode = null) => {
    try {
      const response = await fetch(`${API_URL}/api/game-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, promo_code: promoCode }),
      });
      if (!response.ok) {
        console.log('Failed to send game result');
      }
    } catch (error) {
      console.log('Error sending game result:', error);
    }
  };

  // заменяем vanilla minimax на минимакс с alpha-beta отсечением и рандомизацией лучших ходов
  const minimax = (squares, depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
    const winner = checkWinner(squares);
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (isBoardFull(squares)) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          const evalScore = minimax(squares, depth + 1, false, alpha, beta);
          squares[i] = null;
          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break; // beta cut-off
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          const evalScore = minimax(squares, depth + 1, true, alpha, beta);
          squares[i] = null;
          minEval = Math.min(minEval, evalScore);
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break; // alpha cut-off
        }
      }
      return minEval;
    }
  };

  const getBestMove = (squares) => {
    // Сбор пустых ячеек
    const empties = [];
    for (let i = 0; i < 9; i++) if (squares[i] === null) empties.push(i);

    // Если подсказка включена — запрещаем O ставить в targetWinCombo: кандидаты исключают target.
    // В противном случае — рассматриваем все пустые клетки.
    const candidates = highlightWin
      ? empties.filter(i => !(targetWinCombo && targetWinCombo.includes(i)))
      : empties;

    if (candidates.length === 0) {
      // При включенной подсказке и отсутствии альтернатив — компьютер пропускает ход (не занимает target)
      return -1;
    }

    // 1) immediate win for O среди кандидатов (не включает target при подсказке)
    for (const i of candidates) {
      squares[i] = 'O';
      if (checkWinner(squares) === 'O') {
        squares[i] = null;
        return i;
      }
      squares[i] = null;
    }

    // 2) immediate block для X среди кандидатов (но не в target при подсказке)
    for (const i of candidates) {
      squares[i] = 'X';
      if (checkWinner(squares) === 'X') {
        squares[i] = null;
        return i;
      }
      squares[i] = null;
    }

    // 3) minimax по кандидатам
    let bestScore = -Infinity;
    const bestMoves = [];
    for (const i of candidates) {
      squares[i] = 'O';
      const score = minimax(squares, 0, false, -Infinity, Infinity);
      squares[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMoves.length = 0;
        bestMoves.push(i);
      } else if (score === bestScore) {
        bestMoves.push(i);
      }
    }
    if (bestMoves.length === 0) return -1;
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  };

  // каждый новый раунд — генерируем новую целевую выигрышную комбинацию
  useEffect(() => {
    // при mount и при старте новой игры это сработает в handleNewGame
  }, []);

  const handleClick = (index) => {
    if (board[index] !== null || gameStatus !== 'playing') {
      return;
    }

    const newBoard = [...board];
    newBoard[index] = isPlayerTurn ? 'X' : 'O';
    setBoard(newBoard);

    const winner = checkWinner(newBoard);
    if (winner) {
      setGameStatus(isPlayerTurn ? 'win' : 'lose');
      setShowModal(true);
      sendGameResult(isPlayerTurn ? 'win' : 'lose', promoCode);
    } else if (isBoardFull(newBoard)) {
      setGameStatus('draw');
      setShowModal(true);
      sendGameResult('draw');
    } else {
      setIsPlayerTurn(!isPlayerTurn);
    }
  };

  const handleNewGame = () => {
    const empty = Array(9).fill(null);
    setBoard(empty);
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setPromoCode(generatePromoCode());
    setShowModal(false);
    // генерируем новую заранее выбранную комбинацию для X
    const combo = winningCombinations[Math.floor(Math.random() * winningCombinations.length)];
    setTargetWinCombo(combo);
  };

  // Ход компьютера (O): когда isPlayerTurn === false, компьютер делает ход автоматически
  useEffect(() => {
    if (isPlayerTurn || gameStatus !== 'playing') return;
    const t = setTimeout(() => {
      const newBoard = [...board];
      const bestMove = getBestMove(newBoard);
      if (bestMove >= 0) {
        newBoard[bestMove] = 'O';
        setBoard(newBoard);
      }
      setIsPlayerTurn(true);

      const winner = checkWinner(newBoard);
      if (winner) {
        setGameStatus(winner === 'X' ? 'win' : 'lose');
        setShowModal(true);
        sendGameResult(winner === 'X' ? 'win' : 'lose');
      } else if (isBoardFull(newBoard)) {
        setGameStatus('draw');
        setShowModal(true);
        sendGameResult('draw');
      }
    }, 250);
    return () => clearTimeout(t);
  }, [isPlayerTurn, board, gameStatus]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-6"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-700 mb-1">Крестики-нолики</h1>
          <p className="text-purple-600 text-sm">
            {gameStatus === 'playing' && `Ходит: ${isPlayerTurn ? 'X (Вы)' : 'O (Компьютер)'}`}
            {gameStatus === 'win' && <span className="text-green-600"> Вы выиграли!</span>}
            {gameStatus === 'lose' && <span className="text-red-600"> Вы проиграли.</span>}
            {gameStatus === 'draw' && <span className="text-yellow-600"> Ничья.</span>}
          </p>
        </div>

        {/* Центрированная кнопка подсказки с иконкой */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => setHighlightWin(h => !h)}
            aria-pressed={highlightWin}
            title={highlightWin ? 'Выключить подсказку' : 'Включить подсказку'}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${highlightWin ? 'bg-yellow-400 text-white shadow-lg' : 'bg-indigo-100 text-indigo-700'}`}>
            <Lightbulb size={18} />
            <span>{highlightWin ? 'Подсказка: Вкл' : 'Подсказка: Выкл'}</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <div className="grid grid-cols-3 gap-3">
            {board.map((square, index) => {
              // подсказка только для заранее выбранной комбинации targetWinCombo
              const isTarget = highlightWin && targetWinCombo && targetWinCombo.includes(index);
              let boxShadow = undefined;
              // тонкая линия подсказки (4px) для лучшей визуальной аккуратности
              if (isTarget) boxShadow = '0 0 0 4px rgba(34,197,94,0.9)';

              const baseBg = square === 'X'
                ? 'bg-gradient-to-br from-pink-400 to-pink-600 text-white shadow-md'
                : square === 'O'
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-md'
                  : 'bg-gradient-to-br from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100';

              return (
                <button
                  key={index}
                  onClick={() => handleClick(index)}
                  disabled={square !== null || gameStatus !== 'playing'}
                  style={boxShadow ? { boxShadow } : undefined}
                  className={`relative aspect-square rounded-2xl text-4xl font-extrabold transition-transform duration-150 ease-in-out flex items-center justify-center ${baseBg} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {square === 'X' && <IconX size={36} className="text-white" />}
                  {square === 'O' && <IconCircle size={36} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleNewGame}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-semibold shadow hover:scale-[1.02] transition-transform duration-150 flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Новая игра
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-semibold mb-4 text-center">
                {gameStatus === 'win' && 'Поздравляем!'}
                {gameStatus === 'lose' && 'Попробуйте снова!'}
                {gameStatus === 'draw' && 'Ничья!'}
              </h2>
              {gameStatus !== 'playing' && (
                <div className="text-center mb-4">
                  <span className="text-4xl font-extrabold">
                    {gameStatus === 'win' ? '🎉' : gameStatus === 'lose' ? '😢' : '🤝'}
                  </span>
                </div>
              )}
              <div className="text-center">
                {gameStatus === 'win' && (
                  <>
                    <p className="text-purple-700 text-sm mb-2">Вы выиграли этот раунд!</p>
                    <p className="text-purple-500 text-xs">Код отправлен в телеграм-бот <a href="https://t.me/TicTocToeBot" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">@TicTocToeBot</a>:</p>
                    <p className="text-lg font-bold">{promoCode}</p>
                  </>
                )}
                {gameStatus === 'lose' && (
                  <p className="text-purple-700 text-sm">К сожалению, вы проиграли. Попробуйте еще раз!</p>
                )}
                {gameStatus === 'draw' && (
                  <p className="text-purple-700 text-sm">Этот раунд закончился ничьей.</p>
                )}
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={handleNewGame}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-semibold shadow hover:scale-[1.02] transition-transform duration-150"
                >
                  Новая игра
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-2xl font-semibold shadow hover:scale-[1.02] transition-transform duration-150"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
