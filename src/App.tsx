import React, { useState, useEffect, useRef, useCallback } from 'react';
import { questionBank } from './lib/questionBank';
import type { Player, Question, SpecialCells } from './interface/Game';
import "./App.css";

const App: React.FC = () => {
  // --- Estados do Jogo ---
  const [screen, setScreen] = useState<'start' | 'game' | 'question' | 'end'>('start');
  const [players, setPlayers] = useState<[Player, Player]>([
    { name: 'Jogador 1', position: 1, color: 'player1', correctAnswers: 0, totalQuestions: 0 },
    { name: 'Jogador 2', position: 1, color: 'player2', correctAnswers: 0, totalQuestions: 0 }
  ]);
  const [playerStats, setPlayerStats] = useState([
    { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } },
    { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } }
  ]);
  const [powerUps, setPowerUps] = useState([
    { doubleRoll: 0, skipQuestion: 0 },
    { doubleRoll: 0, skipQuestion: 0 }
  ]);
  const [currentPlayerId, setCurrentPlayerId] = useState<0 | 1>(0);
  const [diceValue, setDiceValue] = useState<number>(0);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [potentialPlayerPosition, setPotentialPlayerPosition] = useState<number>(0);
  const [feedback, setFeedback] = useState({ message: '', type: '' as 'correct' | 'wrong' | 'bonus' | 'penalty' | '' });
  const [highlightedCell, setHighlightedCell] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answerState, setAnswerState] = useState<{ selectedIndex: number | null; isCorrect: boolean | null }>({ selectedIndex: null, isCorrect: null });
  const [usedQuestions, setUsedQuestions] = useState<Question[]>([]);

  const diceRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<any| null>(null);

  // Células especiais
  const specialCells: SpecialCells = {
    5: { type: 'bonus', text: '+2', move: 2 },
    12: { type: 'bonus', text: '+3', move: 3 },
    19: { type: 'bonus', text: '+5', move: 5 },
    25: { type: 'penalty', text: '-3', move: -3 },
    32: { type: 'bonus', text: '+6', move: +6 },
    38: { type: 'penalty', text: '-3', move: -3 },
    45: { type: 'penalty', text: '-4', move: -4 },
    59: { type: 'penalty', text: '-2', move: -2 },
    66: { type: 'bonus', text: '+4', move: 4 },
    78: { type: 'penalty', text: '-5', move: -5 },
    84: { type: 'bonus', text: '+6', move: 6 },
    91: { type: 'penalty', text: '-6', move: -6 },
    97: { type: 'penalty', text: '-3', move: -3 }
  };

  // --- Funções Auxiliares ---
  const shuffleArray = useCallback((array: Question[]): Question[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const showFeedback = useCallback((message: string, type: 'correct' | 'wrong' | 'bonus' | 'penalty' | '') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 2000);
  }, []);

  const getPlayerColor = useCallback((playerId: 0 | 1): string => {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(playerId === 0 ? '--player1-color' : '--player2-color');
  }, []);

  // --- Lógica do Jogo ---
  const startGame = useCallback(() => {
    setPlayers((prev: any) => prev.map((p: any, i: any) => ({
      ...p,
      name: p.name.trim() || `Jogador ${i + 1}`,
      position: 1,
      correctAnswers: 0,
      totalQuestions: 0
    })));
    setPlayerStats([
      { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } },
      { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } }
    ]);
    setPowerUps([{ doubleRoll: 0, skipQuestion: 0 }, { doubleRoll: 0, skipQuestion: 0 }]);
    setCurrentPlayerId(0);
    setAvailableQuestions(shuffleArray([...questionBank]));
    setUsedQuestions([]);
    setScreen('game');
  }, [shuffleArray]);

  const endGame = useCallback(() => setScreen('end'), []);

  const restartGame = useCallback(() => {
    setScreen('start');
    setPlayers([
      { name: 'Jogador 1', position: 1, color: 'player1', correctAnswers: 0, totalQuestions: 0 },
      { name: 'Jogador 2', position: 1, color: 'player2', correctAnswers: 0, totalQuestions: 0 }
    ]);
    setDiceValue(0);
    setCurrentQuestion(null);
    setPotentialPlayerPosition(0);
    setFeedback({ message: '', type: '' });
    setHighlightedCell(null);
    setIsRolling(false);
    setTimeLeft(0);
    setAnswerState({ selectedIndex: null, isCorrect: null });
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const switchPlayer = useCallback(() => {
    setCurrentPlayerId(prev => (prev === 0 ? 1 : 0));
    setIsRolling(false);
  }, []);

  const animatePlayerMovement = useCallback((playerId: number, startPos: number, endPos: number, callback?: () => void) => {
    let currentPos = startPos;
    const step = endPos > startPos ? 1 : -1;
    
    const moveInterval = setInterval(() => {
      currentPos += step;
      if ((step === 1 && currentPos > endPos) || (step === -1 && currentPos < endPos)) {
        currentPos = endPos;
      }

      setPlayers((prev: any) => prev.map((p: any, i: any) => 
        i === playerId ? { ...p, position: currentPos } : p
      ));

      if (currentPos === endPos) {
        clearInterval(moveInterval);
        callback?.();
      }
    }, 150);
  }, []);

  const handleTimeUp = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    document.querySelectorAll('.option').forEach(option => {
      (option as HTMLElement).style.pointerEvents = 'none';
    });

    showFeedback('Tempo esgotado!', 'wrong');
    setAnswerState({ selectedIndex: null, isCorrect: false });

    setTimeout(() => {
      setScreen('game');
      setCurrentQuestion(null);
      setAnswerState({ selectedIndex: null, isCorrect: null });
      switchPlayer();
    }, 2000);
  }, [showFeedback, switchPlayer]);

  const handleAnswer = useCallback((selectedIndex: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    document.querySelectorAll('.option').forEach(option => {
      (option as HTMLElement).style.pointerEvents = 'none';
    });

    if (!currentQuestion) return;

    // Atualiza estatísticas
    setPlayers((prev: any) => prev.map((p: any, i: any) => 
      i === currentPlayerId ? { ...p, totalQuestions: p.totalQuestions + 1 } : p
    ));

    setPlayerStats(prev => {
      const newStats = [...prev];
      newStats[currentPlayerId][currentQuestion.difficulty].total += 1;
      return newStats;
    });

    const isCorrect = selectedIndex === currentQuestion.answer;
    setAnswerState({ selectedIndex, isCorrect });

    if (isCorrect) {
      setPlayerStats(prev => {
        const newStats = [...prev];
        newStats[currentPlayerId][currentQuestion.difficulty].correct += 1;
        return newStats;
      });

      setPlayers((prev: any) => prev.map((p: any, i: any) => 
        i === currentPlayerId ? { ...p, correctAnswers: p.correctAnswers + 1 } : p
      ));

      showFeedback(`Correto! ${currentQuestion.reference ? 'Referência: ' + currentQuestion.reference : ''}`, 'correct');

      animatePlayerMovement(currentPlayerId, players[currentPlayerId].position, potentialPlayerPosition, () => {
        const cell: any = specialCells[potentialPlayerPosition];
        if (cell) {
          // Chance de ganhar power-up em casas de bônus
          if (cell.type === 'bonus' && Math.random() < 0.3) {
            const powerUpType = Math.random() < 0.5 ? 'doubleRoll' : 'skipQuestion';
            setPowerUps(prev => {
              const newPowerUps = [...prev];
              newPowerUps[currentPlayerId][powerUpType] += 1;
              return newPowerUps;
            });
            showFeedback(`Você ganhou um power-up: ${powerUpType === 'doubleRoll' ? 'Dado Duplo' : 'Pular Pergunta'}!`, 'bonus');
          }

          const finalPosition = Math.min(Math.max(potentialPlayerPosition + cell.move, 1), 100);
          showFeedback(`${players[currentPlayerId].name} ${cell.type === 'bonus' ? 'avançou' : 'retrocedeu'} ${Math.abs(cell.move)} casas!`, cell.type);
          setHighlightedCell(potentialPlayerPosition);
          setTimeout(() => setHighlightedCell(null), 1000);

          animatePlayerMovement(currentPlayerId, potentialPlayerPosition, finalPosition, () => {
            finalPosition === 100 ? endGame() : switchPlayer();
          });
        } else {
          potentialPlayerPosition === 100 ? endGame() : switchPlayer();
        }
      });
    } else {
      showFeedback('Incorreto.', 'wrong');
      setTimeout(switchPlayer, 2000);
    }

    setTimeout(() => {
      setScreen('game');
      setCurrentQuestion(null);
      setAnswerState({ selectedIndex: null, isCorrect: null });
    }, 2000);
  }, [currentQuestion, currentPlayerId, players, potentialPlayerPosition, showFeedback, animatePlayerMovement, specialCells, endGame, switchPlayer]);

  const getQuestionsByPosition = useCallback((position: number, questions: Question[]) => {
    if (position < 30) return questions.filter(q => q.difficulty === 'easy');
    if (position < 70) return questions.filter(q => q.difficulty !== 'hard');
    return questions;
  }, []);

  const rollDice = useCallback(() => {
    setIsRolling(true);
    if (diceRef.current) diceRef.current.textContent = '...';

    let rolls = 0;
    const rollInterval = setInterval(() => {
      const newValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(newValue);
      if (diceRef.current) diceRef.current.textContent = newValue.toString();
      rolls++;

      if (rolls > 10) {
        clearInterval(rollInterval);
        setTimeout(() => {
          const newPos = Math.min(Math.max(players[currentPlayerId].position + newValue, 1), 100);
          setPotentialPlayerPosition(newPos);

          // Gerenciamento de perguntas
          let questionsToUse = availableQuestions;
          if (availableQuestions.length === 0) {
            if (usedQuestions.length === questionBank.length) {
              questionsToUse = shuffleArray([...questionBank]);
              setUsedQuestions([]);
            } else {
              questionsToUse = shuffleArray(questionBank.filter(q => 
                !usedQuestions.some(uq => uq.question === q.question)
              ));
            }
            setAvailableQuestions(questionsToUse);
          }

          const eligibleQuestions = getQuestionsByPosition(players[currentPlayerId].position, questionsToUse);
          const randomIndex = Math.floor(Math.random() * eligibleQuestions.length);
          const nextQuestion = eligibleQuestions[randomIndex];
          
          setCurrentQuestion(nextQuestion);
          setAvailableQuestions(prev => prev.filter(q => q.question !== nextQuestion.question));
          setUsedQuestions(prev => [...prev, nextQuestion]);
          setScreen('question');
        }, 500);
      }
    }, 100);
  }, [currentPlayerId, players, availableQuestions, usedQuestions, shuffleArray, getQuestionsByPosition]);

  // Timer da pergunta
  useEffect(() => {
    if (screen === 'question' && currentQuestion) {
      let initialTime = 30;
      switch (currentQuestion.difficulty) {
        case 'medium': initialTime = 45; break;
        case 'hard': initialTime = 60; break;
      }
      setTimeLeft(initialTime);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [screen, currentQuestion, handleTimeUp]);

  // Renderização do tabuleiro
  const renderGameBoard = useCallback(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const cellNumber = i + 1;
      const cell = specialCells[cellNumber];
      let cellClasses = 'cell';
      let cellContent: React.ReactNode = null;

      if (cellNumber === 1) {
        cellClasses += ' start';
        cellContent = <div className="cell-extra-content">Início</div>;
      } else if (cellNumber === 100) {
        cellClasses += ' end';
        cellContent = <div className="cell-extra-content">🎉</div>;
      } else if (cell) {
        cellClasses += ' special';
        cellContent = <div className="cell-extra-content">{cell.text}</div>;
      }

      if (highlightedCell === cellNumber && cell) {
        cellClasses += ` highlight-${cell.type}`;
      }

      return (
        <div key={cellNumber} className={cellClasses}>
          <div className="cell-number">{cellNumber}</div>
          {players[0].position === cellNumber && <div className="player-token player1-token active"></div>}
          {players[1].position === cellNumber && <div className="player-token player2-token active"></div>}
          {cellContent}
        </div>
      );
    });
  }, [players, highlightedCell, specialCells]);

  return (
    <div className="game-container">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400&display=swap" rel="stylesheet" />

      <header className="game-header">
        <h1><i className="fas fa-bible"></i> Viagem pela Bíblia</h1>
        <p className="subtitle">Jogo de Tabuleiro Bíblico</p>
      </header>

      {screen === 'start' && (
        <div id="start-screen" className="screen active">
          <div className="bible-image"></div>
          <div className="start-content">
            <h2>Bem-vindo à Jornada Bíblica!</h2>
            <p>Avance pelo tabuleiro respondendo perguntas sobre a Bíblia. O primeiro a chegar na casa 100 vence!</p>
            <div className="player-setup">
              {players.map((player, i) => (
                <div key={i} className="form-group">
                  <label htmlFor={`player${i+1}-name-input`}>Jogador {i+1}:</label>
                  <input
                    type="text"
                    id={`player${i+1}-name-input`}
                    placeholder={`Nome do Jogador ${i+1}`}
                    value={player.name}
                    onChange={(e) => setPlayers(prev => 
                      prev.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p)
                    )}
                  />
                </div>
              ))}
            </div>
            <button id="start-btn" className="btn" onClick={startGame}>
              <i className="fas fa-play"></i> Começar Jogo
            </button>
          </div>
        </div>
      )}

      {screen === 'game' && (
        <div id="game-screen" className="screen active">
          <div className="game-board-container">
            <div className="players-info">
              {players.map((player, i) => (
                <div key={i} className={`player ${i === currentPlayerId ? 'current' : ''}`} 
                     style={{ color: getPlayerColor(i as 0 | 1) }}>
                  <div className="player-name">{player.name}</div>
                  <div className="player-position">Posição: {player.position}</div>
                </div>
              ))}
              <div className="dice-container">
                <div className="dice" ref={diceRef}>{diceValue || '?'}</div>
                <button id="roll-btn" className="btn" onClick={rollDice} disabled={isRolling}>
                  <i className="fas fa-dice"></i> Lançar Dado
                </button>
              </div>
            </div>
            
            <div className="game-board">{renderGameBoard()}</div>
            
            <div className="current-player" style={{ color: getPlayerColor(currentPlayerId) }}>
              Vez de: {players[currentPlayerId].name}
            </div>
          </div>
        </div>
      )}

      {screen === 'question' && currentQuestion && (
        <div id="question-screen" className="question-screen active">
          <div className="question-container">
            <div className="question-header">
              <h3>Pergunta Bíblica</h3>
              <div className="timer-display">Tempo: {timeLeft}s</div>
              {currentQuestion.reference && (
                <div className="reference">{currentQuestion.reference}</div>
              )}
            </div>
            <div className="question">{currentQuestion.question}</div>
            <div className="options-container">
              {currentQuestion.options.map((option, i) => {
                let optionClass = "option";
                if (answerState.selectedIndex !== null && i === answerState.selectedIndex) {
                  optionClass += answerState.isCorrect ? " correct" : " wrong";
                }
                return (
                  <div key={i} className={optionClass} onClick={() => handleAnswer(i)}>
                    {option}
                  </div>
                );
              })}
            </div>
            {feedback.message && (
              <div className={`feedback show ${feedback.type}`}>
                {feedback.message}
              </div>
            )}
          </div>
        </div>
      )}

      {screen === 'end' && (
        <div id="end-screen" className="screen active">
          <div className="end-content">
            <h2>Fim de Jogo!</h2>
            <div className="winner">
              {players[currentPlayerId].name} venceu a jornada bíblica!
            </div>
            <div className="final-stats">
              <h3>Estatísticas do Jogo:</h3>
              {players.map((player, i) => (
                <div key={i} className="player-stats">
                  <strong>{player.name}</strong><br/>
                  Perguntas respondidas: {player.totalQuestions}<br/>
                  Acertos: {player.correctAnswers} (
                    {player.totalQuestions > 0 
                      ? Math.round((player.correctAnswers / player.totalQuestions) * 100) 
                      : 0}%)<br/>
                  Posição final: {player.position}
                </div>
              ))}
            </div>
            <button id="restart-btn" className="btn" onClick={restartGame}>
              <i className="fas fa-redo"></i> Jogar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;