export type ScreenState =
  | "idle"
  | "trivia-q"
  | "trivia-rev"
  | "predictor-q"
  | "predictor-w"
  | "predictor-r";

export interface TriviaQuestion {
  questionId: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  questionNumber: number;
  totalQuestions: number;
  durationMs: number;
}

export interface TriviaReveal {
  questionId: string;
  correctAnswer: "A" | "B" | "C" | "D";
  answerCounts: { A: number; B: number; C: number; D: number };
  totalAnswers: number;
  funFact: string | null;
  leaderboard: LeaderboardEntry[];
}

export interface PredictorQuestion {
  questionId: string;
  playerName: string;
  teamName: string;
  teamColorHome?: string;
  teamColorAway?: string;
  statLabel: string;
  statLine: number;
  sportsiqProbability: number;
  locksAt: string;
}

export interface PredictorCrowdSplit {
  more: number;
  less: number;
  morePercent: number;
  lessPercent: number;
}

export interface PredictorResolved {
  questionId: string;
  result: "more" | "less";
  finalStat: number;
  crowdSplit: PredictorCrowdSplit;
  wiseGuyPoints: number;
  heatCheckPoints: number;
  chalkPoints: number;
}

export interface IntelligenceAlert {
  question: string;
  teamName?: string;
  from: number;
  to: number;
  direction: "up" | "down";
  movePct: number;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalPoints: number;
}

export interface AnswerCounts {
  A: number;
  B: number;
  C: number;
  D: number;
}
