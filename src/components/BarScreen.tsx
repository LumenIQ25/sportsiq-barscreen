import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { C, FONT } from "../theme";
import { useBarSockets } from "../hooks/useBarSockets";
import { InjectStyles } from "./ui/InjectStyles";
import { IntelAlertOverlay } from "./ui/IntelAlertOverlay";
import { MiniQrBadge } from "./ui/MiniQrBadge";
import { IdleScreen } from "./screens/IdleScreen";
import { TriviaQuestionScreen } from "./screens/TriviaQuestionScreen";
import { TriviaRevealScreen } from "./screens/TriviaRevealScreen";
import { PredictorQuestionScreen } from "./screens/PredictorQuestionScreen";
import { PredictorWaitingScreen } from "./screens/PredictorWaitingScreen";
import { PredictorResultScreen } from "./screens/PredictorResultScreen";

interface Props {
  token: string;
  barId: string;
  roomCode: string;
  joinUrl: string;
}

export function BarScreen({ token, barId, roomCode, joinUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  const state = useBarSockets(token, barId);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#F8FAFC", light: "#0B2230" },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [joinUrl]);

  return (
    <div style={{
      background: C.bgOuter,
      minHeight: "100vh",
      fontFamily: FONT,
      color: C.text,
      position: "relative",
      overflow: "hidden",
    }}>
      <InjectStyles />

      {state.intelAlert && <IntelAlertOverlay alert={state.intelAlert} />}

      {state.screen === "idle" && (
        <IdleScreen
          leaderboard={state.leaderboard}
          qrDataUrl={qrDataUrl}
          roomCode={roomCode}
        />
      )}

      {state.screen === "trivia-q" && state.triviaQ && (
        <TriviaQuestionScreen
          triviaQ={state.triviaQ}
          answerCounts={state.answerCounts}
          totalAnswers={state.totalAnswers}
          countdown={state.countdown}
        />
      )}

      {state.screen === "trivia-rev" && state.triviaRev && state.triviaQ && (
        <TriviaRevealScreen
          triviaQ={state.triviaQ}
          triviaRev={state.triviaRev}
          leaderboard={state.leaderboard}
        />
      )}

      {state.screen === "predictor-q" && state.predQ && (
        <PredictorQuestionScreen
          predQ={state.predQ}
          predCrowd={state.predCrowd}
          countdown={state.countdown}
          qrDataUrl={qrDataUrl}
          roomCode={roomCode}
        />
      )}

      {state.screen === "predictor-w" && state.predQ && state.predCrowd && (
        <PredictorWaitingScreen
          predQ={state.predQ}
          predCrowd={state.predCrowd}
          predCurrentStat={state.predCurrentStat}
          qrDataUrl={qrDataUrl}
          roomCode={roomCode}
        />
      )}

      {state.screen === "predictor-r" && state.predResolved && state.predQ && (
        <PredictorResultScreen
          predQ={state.predQ}
          predResolved={state.predResolved}
          predCrowd={state.predCrowd}
        />
      )}

      <MiniQrBadge qrDataUrl={qrDataUrl} roomCode={roomCode} />
    </div>
  );
}
