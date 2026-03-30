import { useEffect, useRef, useState } from "react";
import {
  getBarTriviaSocket,
  getBarMoreLessSocket,
  getIntelligenceSocket,
} from "../lib/socket";
import { secondsUntil } from "../utils";
import type {
  ScreenState,
  TriviaQuestion,
  TriviaReveal,
  PredictorQuestion,
  PredictorCrowdSplit,
  PredictorResolved,
  IntelligenceAlert,
  LeaderboardEntry,
  AnswerCounts,
} from "../types";

export interface BarSocketState {
  screen: ScreenState;
  triviaQ: TriviaQuestion | null;
  triviaRev: TriviaReveal | null;
  answerCounts: AnswerCounts | null;
  totalAnswers: number;
  predQ: PredictorQuestion | null;
  predCrowd: PredictorCrowdSplit | null;
  predResolved: PredictorResolved | null;
  predCurrentStat: number | null;
  predProbability: number | null;
  intelAlert: IntelligenceAlert | null;
  leaderboard: LeaderboardEntry[];
  countdown: number;
}

export function useBarSockets(token: string, barId: string): BarSocketState {
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [triviaQ, setTriviaQ] = useState<TriviaQuestion | null>(null);
  const [triviaRev, setTriviaRev] = useState<TriviaReveal | null>(null);
  const [answerCounts, setAnswerCounts] = useState<AnswerCounts | null>(null);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [predQ, setPredQ] = useState<PredictorQuestion | null>(null);
  const [predCrowd, setPredCrowd] = useState<PredictorCrowdSplit | null>(null);
  const [predResolved, setPredResolved] = useState<PredictorResolved | null>(null);
  const [predCurrentStat, setPredCurrentStat] = useState<number | null>(null);
  const [predProbability, setPredProbability] = useState<number | null>(null);
  const [intelAlert, setIntelAlert] = useState<IntelligenceAlert | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startCountdown(seconds: number) {
    clearCountdown();
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
  }

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  useEffect(() => {
    const trivia = getBarTriviaSocket(token, barId);
    const moreless = getBarMoreLessSocket(token, barId);
    const intel = getIntelligenceSocket(token);

    // Trivia events
    trivia.on("trivia:question", (q: TriviaQuestion) => {
      setTriviaQ(q);
      setTriviaRev(null);
      setAnswerCounts({ A: 0, B: 0, C: 0, D: 0 });
      setTotalAnswers(0);
      setScreen("trivia-q");
      startCountdown(q.durationMs / 1000);
    });

    trivia.on("trivia:answer_counts", (counts: AnswerCounts) => {
      setAnswerCounts(counts);
      setTotalAnswers(Object.values(counts).reduce((a, b) => a + b, 0));
    });

    trivia.on("trivia:reveal", (rev: TriviaReveal) => {
      setTriviaRev(rev);
      setAnswerCounts(rev.answerCounts);
      setTotalAnswers(rev.totalAnswers);
      setLeaderboard(rev.leaderboard ?? []);
      setScreen("trivia-rev");
      clearCountdown();
    });

    trivia.on("trivia:leaderboard", (entries: LeaderboardEntry[]) => {
      setLeaderboard(entries);
    });

    // Predictor events
    moreless.on("moreless:question", (q: PredictorQuestion) => {
      setPredQ(q);
      setPredCrowd(null);
      setPredResolved(null);
      setPredCurrentStat(null);
      setPredProbability(q.sportsiqProbability);
      setScreen("predictor-q");
      startCountdown(secondsUntil(q.locksAt));
    });

    moreless.on("moreless:crowd_update", (split: PredictorCrowdSplit) => {
      setPredCrowd(split);
    });

    moreless.on("moreless:stat_update", (u: { currentStat: number; probability: number }) => {
      setPredCurrentStat(u.currentStat);
      setPredProbability(u.probability);
    });

    moreless.on("moreless:locked", (locked: { crowdSplit: PredictorCrowdSplit }) => {
      setPredCrowd(locked.crowdSplit);
      setScreen("predictor-w");
      clearCountdown();
    });

    moreless.on("moreless:resolved", (res: PredictorResolved) => {
      setPredResolved(res);
      setPredCrowd(res.crowdSplit);
      setScreen("predictor-r");
    });

    // Intelligence alerts
    intel.on("intelligence:alert", (alert: IntelligenceAlert) => {
      setIntelAlert(alert);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => {
        setIntelAlert(null);
        alertTimeoutRef.current = null;
      }, 15_000);
    });

    trivia.connect();
    moreless.connect();
    intel.connect();
    trivia.emit("barscreen:join", { barId });
    moreless.emit("barscreen:join", { barId });

    return () => {
      trivia.off("trivia:question");
      trivia.off("trivia:answer_counts");
      trivia.off("trivia:reveal");
      trivia.off("trivia:leaderboard");
      moreless.off("moreless:question");
      moreless.off("moreless:crowd_update");
      moreless.off("moreless:stat_update");
      moreless.off("moreless:locked");
      moreless.off("moreless:resolved");
      intel.off("intelligence:alert");
      clearCountdown();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [token, barId]);

  return {
    screen,
    triviaQ,
    triviaRev,
    answerCounts,
    totalAnswers,
    predQ,
    predCrowd,
    predResolved,
    predCurrentStat,
    predProbability,
    intelAlert,
    leaderboard,
    countdown,
  };
}
