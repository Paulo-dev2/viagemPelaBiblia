export interface Question {
  question: string;
  options: string[];
  answer: number;
  reference: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Player {
  name: string;
  position: number;
  color: 'player1' | 'player2';
  correctAnswers: number;
  totalQuestions: number;
}

export interface SpecialCell {
  type: 'bonus' | 'penalty' | 'question';
  text: string;
  move: number;
}

export interface SpecialCells {
  [key: number]: SpecialCell;
}