import React, { useState, useEffect, useRef, useCallback } from 'react';
import { questionBank } from './lib/questionBank'; // Importa o banco de perguntas
import type { Player, Question, SpecialCells } from './interface/Game';
import "./App.css"; // Importa o CSS externo

const App: React.FC = () => {
  // --- Estados do Jogo ---
  const [screen, setScreen] = useState<'start' | 'game' | 'question' | 'end'>('start');
  const [player1, setPlayer1] = useState<Player>({ name: 'Jogador 1', position: 1, color: 'player1', correctAnswers: 0, totalQuestions: 0 });
  const [player2, setPlayer2] = useState<Player>({ name: 'Jogador 2', position: 1, color: 'player2', correctAnswers: 0, totalQuestions: 0 });
  const [currentPlayerId, setCurrentPlayerId] = useState<1 | 2>(1);
  const [diceValue, setDiceValue] = useState<number>(0);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [potentialPlayerPosition, setPotentialPlayerPosition] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | 'bonus' | 'penalty' | ''>('');
  const [highlightedCell, setHighlightedCell] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false); // Para controlar o estado de rolagem do dado
  const [timeLeft, setTimeLeft] = useState<number>(0); // Estado para o tempo restante do timer
  // NOVO ESTADO: Para controlar o estilo da opção selecionada
  const [answerState, setAnswerState] = useState<{ selectedIndex: number | null; isCorrect: boolean | null }>({ selectedIndex: null, isCorrect: null });

  // Referências para elementos DOM que precisam de acesso direto (ex: dado, timer interval)
  const diceRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<any>(null); // Ref para o ID do setInterval

  // Células especiais (mantidas como objeto para fácil acesso)
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

  // Função para embaralhar um array (Fisher-Yates)
  const shuffleArray = useCallback((array: Question[]): Question[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Função para mostrar feedback temporário
  const showFeedback = useCallback((message: string, type: 'correct' | 'wrong' | 'bonus' | 'penalty' | '') => {
    setFeedbackMessage(message);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedbackMessage('');
      setFeedbackType('');
    }, 2000);
  }, []);

  // Obtém a cor do CSS variável (função pura, não React-specific)
  const getPlayerColor = useCallback((playerId: 1 | 2): string => {
    if (typeof document === 'undefined') return ''; // Previne erro em SSR
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue(playerId === 1 ? '--player1-color' : '--player2-color');
  }, []);

  // --- Lógica do Jogo ---

  const startGame = useCallback(() => {
    setPlayer1(prev => ({
      ...prev,
      name: prev.name.trim() === '' ? 'Jogador 1' : prev.name,
      position: 1,
      correctAnswers: 0,
      totalQuestions: 0
    }));
    setPlayer2(prev => ({
      ...prev,
      name: prev.name.trim() === '' ? 'Jogador 2' : prev.name,
      position: 1,
      correctAnswers: 0,
      totalQuestions: 0
    }));
    setCurrentPlayerId(1);
    setAvailableQuestions(shuffleArray([...questionBank]));
    setScreen('game');
  }, [shuffleArray]);

  const endGame = useCallback(() => {
    setScreen('end');
  }, []);

  const restartGame = useCallback(() => {
    setScreen('start');
    setPlayer1({ name: 'Jogador 1', position: 1, color: 'player1', correctAnswers: 0, totalQuestions: 0 });
    setPlayer2({ name: 'Jogador 2', position: 1, color: 'player2', correctAnswers: 0, totalQuestions: 0 });
    setDiceValue(0);
    setCurrentQuestion(null);
    setPotentialPlayerPosition(0);
    setFeedbackMessage('');
    setFeedbackType('');
    setHighlightedCell(null);
    setIsRolling(false);
    setTimeLeft(0); // Resetar tempo
    setAnswerState({ selectedIndex: null, isCorrect: null }); // Resetar estado de resposta
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
  }, []);

  const switchPlayer = useCallback(() => {
    setCurrentPlayerId(prev => (prev === 1 ? 2 : 1));
    setIsRolling(false); // Permite rolar o dado novamente
  }, []);

  const animatePlayerMovement = useCallback((player: Player, startPos: number, endPos: number, callback?: () => void) => {
    let currentPos = startPos;
    const step = (endPos > startPos) ? 1 : -1;
    
    const moveInterval = setInterval(() => {
      currentPos += step;

      if ((step === 1 && currentPos > endPos) || (step === -1 && currentPos < endPos)) {
        currentPos = endPos;
      }

      if (player.color === 'player1') {
        setPlayer1(prev => ({ ...prev, position: currentPos }));
      } else {
        setPlayer2(prev => ({ ...prev, position: currentPos }));
      }

      if (currentPos === endPos) {
        clearInterval(moveInterval);
        if (callback) callback();
      }
    }, 150);
  }, []);

  // Função para lidar com o tempo esgotado na pergunta
  const handleTimeUp = useCallback(() => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }

    // Desabilita as opções para evitar cliques tardios
    document.querySelectorAll('.option').forEach(option => {
        (option as HTMLElement).style.pointerEvents = 'none';
    });

    showFeedback(`Tempo esgotado!`, 'wrong');
    setAnswerState({ selectedIndex: null, isCorrect: false }); // Marca como incorreto por tempo esgotado

    setTimeout(() => {
        setScreen('game');
        setCurrentQuestion(null);
        setAnswerState({ selectedIndex: null, isCorrect: null }); // Resetar estado de resposta
        switchPlayer();
    }, 2000); // Delay para feedback
  }, [showFeedback, switchPlayer]);


  const handleAnswer = useCallback((selectedIndex: number) => {
    if (timerIntervalRef.current) { // Para o timer assim que uma resposta é selecionada
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }

    const currentPlayerObj = currentPlayerId === 1 ? player1 : player2;
    const setPlayer = currentPlayerId === 1 ? setPlayer1 : setPlayer2;

    // Desabilita as opções para evitar múltiplos cliques
    document.querySelectorAll('.option').forEach(option => {
      (option as HTMLElement).style.pointerEvents = 'none';
    });

    if (currentQuestion && selectedIndex === currentQuestion.answer) {
      // Resposta correta
      setAnswerState({ selectedIndex: selectedIndex, isCorrect: true }); // Marca a opção selecionada como correta
      showFeedback(`Correto! ${currentQuestion.reference ? 'Referência: ' + currentQuestion.reference : ''}`, 'correct');
      setPlayer(prev => ({ ...prev, correctAnswers: prev.correctAnswers + 1 }));

      // Anima o movimento principal
      animatePlayerMovement(currentPlayerObj, currentPlayerObj.position, potentialPlayerPosition, () => {
        // Verifica e aplica efeitos de casas especiais
        const cell = specialCells[potentialPlayerPosition];
        if (cell && (cell.type === 'bonus' || cell.type === 'penalty')) {
          const oldSpecialPosition = potentialPlayerPosition;
          let finalPositionAfterSpecial = potentialPlayerPosition + cell.move;

          if (finalPositionAfterSpecial < 1) finalPositionAfterSpecial = 1;
          if (finalPositionAfterSpecial > 100) finalPositionAfterSpecial = 100;

          showFeedback(`${currentPlayerObj.name} ${cell.type === 'bonus' ? 'avançou' : 'retrocedeu'} ${Math.abs(cell.move)} casas!`, cell.type);

          // Destaca a célula especial brevemente
          setHighlightedCell(oldSpecialPosition);
          setTimeout(() => {
            setHighlightedCell(null);
          }, 1000);

          // Anima o movimento especial
          animatePlayerMovement(currentPlayerObj, oldSpecialPosition, finalPositionAfterSpecial, () => {
            if (finalPositionAfterSpecial === 100) {
              endGame();
            } else {
              switchPlayer();
            }
          });
        } else {
          // Sem movimento especial, apenas verifica vitória e troca de jogador
          if (potentialPlayerPosition === 100) {
            endGame();
          } else {
            switchPlayer();
          }
        }
      });
    } else {
      // Resposta incorreta
      setAnswerState({ selectedIndex: selectedIndex, isCorrect: false }); // Marca a opção selecionada como incorreta
      showFeedback(`Incorreto.`, 'wrong'); // Feedback mais simples, NÃO revela a correta

      // Jogador não se move se a resposta estiver incorreta.
      setTimeout(() => {
        switchPlayer();
      }, 2000);
    }

    // Esconde a tela de pergunta após um atraso para o feedback
    setTimeout(() => {
      setScreen('game'); // Volta para a tela do tabuleiro
      setCurrentQuestion(null); // Limpa a pergunta atual
      setAnswerState({ selectedIndex: null, isCorrect: null }); // Resetar estado de resposta para a próxima pergunta
    }, 2000);
  }, [currentPlayerId, player1, player2, currentQuestion, potentialPlayerPosition, showFeedback, animatePlayerMovement, specialCells, endGame, switchPlayer]);


  const rollDice = useCallback(() => {
    setIsRolling(true); // Desabilita o botão de dado
    if (diceRef.current) {
      diceRef.current.textContent = '...';
    }

    let rolls = 0;
    const rollInterval = setInterval(() => {
      const newValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(newValue);
      if (diceRef.current) {
        diceRef.current.textContent = newValue.toString();
      }
      rolls++;

      if (rolls > 10) {
        clearInterval(rollInterval);
        setTimeout(() => {
          const player = currentPlayerId === 1 ? player1 : player2;
          let newPos = player.position + diceValue;

          if (newPos > 100) {
            newPos = 100 - (newPos - 100);
          } else if (newPos < 1) {
            newPos = 1;
          }
          setPotentialPlayerPosition(newPos);
          
          // Seleciona e mostra a pergunta
          if (availableQuestions.length === 0) {
            setAvailableQuestions(shuffleArray([...questionBank]));
          }
          const randomIndex = Math.floor(Math.random() * availableQuestions.length);
          const nextQuestion = availableQuestions[randomIndex];
          setCurrentQuestion(nextQuestion);
          setAvailableQuestions(prev => prev.filter((_, idx) => idx !== randomIndex));
          
          setScreen('question'); // Muda para a tela de pergunta
        }, 500);
      }
    }, 100);
  }, [currentPlayerId, player1, player2, diceValue, availableQuestions, shuffleArray]);

  // --- Efeito para o Timer da Pergunta ---
  useEffect(() => {
    if (screen === 'question' && currentQuestion) {
        let initialTime = 0;
        switch (currentQuestion.difficulty) {
            case 'easy':
                initialTime = 30;
                break;
            case 'medium':
                initialTime = 45;
                break;
            case 'hard':
                initialTime = 60;
                break;
            default:
                initialTime = 30; // Fallback
        }
        setTimeLeft(initialTime);

        // Limpa qualquer timer existente
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timerIntervalRef.current!);
                    timerIntervalRef.current = null;
                    handleTimeUp(); // Chama o handler para tempo esgotado
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    } else {
        // Limpa o timer quando não está na tela de pergunta
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }

    // Função de limpeza para o useEffect
    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };
  }, [screen, currentQuestion, handleTimeUp]); // Depende de screen, currentQuestion e handleTimeUp


  // --- Renderização dos Componentes ---

  const renderGameBoard = useCallback(() => {
    const cells = [];
    for (let i = 1; i <= 100; i++) {
      let cellContent: React.ReactNode = null;
      let cellClasses = 'cell';

      if (i === 1) {
        cellClasses += ' start';
        cellContent = <div className="cell-extra-content">Início</div>;
      } else if (i === 100) {
        cellClasses += ' end';
        cellContent = <div className="cell-extra-content">🎉</div>;
      } else if (specialCells[i]) {
        cellClasses += ' special';
        if (specialCells[i].type !== 'question') {
          cellContent = <div className="cell-extra-content">{specialCells[i].text}</div>;
        } else {
          cellContent = <div className="cell-extra-content"><i className="fas fa-question-circle"></i></div>;
        }
      }

      if (highlightedCell === i) {
        const type = specialCells[i]?.type;
        if (type === 'bonus' || type === 'penalty') {
            cellClasses += ` highlight-${type}`;
        }
      }

      cells.push(
        <div key={i} id={`cell-${i}`} className={cellClasses}>
          <div className="cell-number">{i}</div>
          {/* Tokens de jogador renderizados condicionalmente com base na posição */}
          {player1.position === i && <div className="player-token player1-token active"></div>}
          {player2.position === i && <div className="player-token player2-token active"></div>}
          {cellContent}
        </div>
      );
    }
    return cells;
  }, [player1.position, player2.position, highlightedCell, specialCells]);

  return (
    <div className="game-container">
      {/* Links para Font Awesome e Google Fonts (mantidos no HTML ou aqui) */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400&display=swap" rel="stylesheet" />

      <header className="game-header">
        <h1><i className="fas fa-bible"></i> Viagem pela Bíblia</h1>
        <p className="subtitle">Jogo de Tabuleiro Bíblico</p>
      </header>

      {/* --- Start Screen --- */}
      {screen === 'start' && (
        <div id="start-screen" className="screen active">
          <div className="bible-image"></div>
          <div className="start-content">
            <h2>Bem-vindo à Jornada Bíblica!</h2>
            <p>Avance pelo tabuleiro respondendo perguntas sobre a Bíblia. O primeiro a chegar na casa 100 vence!</p>
            <div className="player-setup">
              <div className="form-group">
                <label htmlFor="player1-name-input">Jogador 1:</label>
                <input
                  type="text"
                  id="player1-name-input"
                  placeholder="Nome do Jogador 1"
                  value={player1.name}
                  onChange={(e) => setPlayer1(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="player2-name-input">Jogador 2:</label>
                <input
                  type="text"
                  id="player2-name-input"
                  placeholder="Nome do Jogador 2"
                  value={player2.name}
                  onChange={(e) => setPlayer2(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>
            <button id="start-btn" className="btn" onClick={startGame}>
              <i className="fas fa-play"></i> Começar Jogo
            </button>
          </div>
        </div>
      )}

      {/* --- Game Screen --- */}
      {screen === 'game' && (
        <div id="game-screen" className="screen active">
          <div className="game-board-container">
            <div className="players-info">
              <div className="player" id="player1-info">
                <div className="player-name">{player1.name}</div>
                <div className="player-position">Posição: {player1.position}</div>
              </div>
              <div className="dice-container">
                <div className="dice" ref={diceRef}>{diceValue === 0 ? '?' : diceValue}</div>
                <button id="roll-btn" className="btn" onClick={rollDice} disabled={isRolling}>
                  <i className="fas fa-dice"></i> Lançar Dado
                </button>
              </div>
              <div className="player" id="player2-info">
                <div className="player-name">{player2.name}</div>
                <div className="player-position">Posição: {player2.position}</div>
              </div>
            </div>
            
            <div className="game-board" id="game-board">
              {renderGameBoard()}
            </div>
            
            <div className="current-player" id="current-player" style={{ color: getPlayerColor(currentPlayerId) }}>
              Vez de: {currentPlayerId === 1 ? player1.name : player2.name}
            </div>
          </div>
        </div>
      )}

      {/* --- Question Screen --- */}
      {screen === 'question' && currentQuestion && (
        <div id="question-screen" className={`question-screen ${screen === 'question' ? 'active' : 'hidden'}`}>
          <div className="question-container">
            <div className="question-header">
              <h3>Pergunta Bíblica</h3>
              <div className="timer-display">Tempo: {timeLeft}s</div> {/* Display do Timer */}
              <div className="reference" id="question-reference">{currentQuestion.reference || ''}</div>
            </div>
            <div id="question" className="question">{currentQuestion.question}</div>
            <div id="options" className="options-container">
              {currentQuestion.options.map((option, index) => {
                let optionClass = "option";
                // Aplica a classe 'correct' ou 'wrong' com base no estado 'answerState'
                if (answerState.selectedIndex !== null && index === answerState.selectedIndex) {
                    if (answerState.isCorrect) {
                        optionClass += " correct";
                    } else {
                        optionClass += " wrong";
                    }
                }
                return (
                  <div key={index} className={optionClass} onClick={() => handleAnswer(index)}>
                    {option}
                  </div>
                );
              })}
            </div>
            {feedbackMessage && (
              <div id="feedback" className={`feedback show ${feedbackType}`}>
                {feedbackMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- End Screen --- */}
      {screen === 'end' && (
        <div id="end-screen" className="screen active">
          <div className="end-content">
            <h2>Fim de Jogo!</h2>
            <div className="winner" id="winner">
              {currentPlayerId === 1 ? player1.name : player2.name} venceu a jornada bíblica!
            </div>
            <div className="final-stats">
              <h3>Estatísticas do Jogo:</h3>
              <div id="player1-stats">
                <strong>{player1.name}</strong><br/>
                Perguntas respondidas: {player1.totalQuestions}<br/>
                Acertos: {player1.correctAnswers} ({player1.totalQuestions > 0 ? Math.round((player1.correctAnswers / player1.totalQuestions) * 100) : 0}%)<br/>
                Posição final: {player1.position}
              </div>
              <div id="player2-stats">
                <strong>{player2.name}</strong><br/>
                Perguntas respondidas: {player2.totalQuestions}<br/>
                Acertos: {player2.correctAnswers} ({player2.totalQuestions > 0 ? Math.round((player2.correctAnswers / player2.totalQuestions) * 100) : 0}%)<br/>
                Posição final: {player2.position}
              </div>
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
