import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { loadWords } from "./fetchWords";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BASE_FALL_DURATION = 5000;
const SPEED_STEP = 400;
const MIN_FALL_DURATION = 1500;
const MAX_LEVELS = 5;

const ENCOURAGEMENTS = [
  "Bra jobbat! 🌟",
  "Perfekt! ⭐",
  "Toppen! 🎉",
  "Snyggt! 💪",
  "Wow! 🔥",
  "Jättebra! 🌈",
  "Rätt! 😄",
];

const CHOICE_COLORS = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77"];

function getFallDuration(level) {
  return Math.max(MIN_FALL_DURATION, BASE_FALL_DURATION - (level - 1) * SPEED_STEP);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getChoices(correct, allWords) {
  const others = allWords
    .filter((w) => w.sv !== correct.sv)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return shuffle([correct, ...others]);
}

// ── Falling word tile ──────────────────────────────────────────────────────────
function FallingWord({ word, onMiss, fallDuration }) {
  const fallAnim = useRef(new Animated.Value(-60)).current;
  const left = useRef(Math.random() * (SCREEN_W - 160) + 10).current;
  const doneRef = useRef(false);

  useEffect(() => {
    const anim = Animated.timing(fallAnim, {
      toValue: SCREEN_H * 0.55,
      duration: fallDuration,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished && !doneRef.current) {
        doneRef.current = true;
        onMiss();
      }
    });
    // On unmount (word answered), prevent stale onMiss callback
    return () => { doneRef.current = true; };
  }, []);

  return (
    <Animated.View
      style={[styles.fallingTile, { left, transform: [{ translateY: fallAnim }] }]}
    >
      <Text style={styles.fallingText}>{word.en}</Text>
    </Animated.View>
  );
}

// ── Celebration screen ─────────────────────────────────────────────────────────
function CelebrationScreen({ score, onRestart }) {
  const msg =
    score >= 30 ? "🏆 Du är ett glosproffs!" :
    score >= 15 ? "⭐ Riktigt bra jobbat!" :
    "💪 Bra kämpat, fortsätt öva!";

  return (
    <View style={styles.centerScreen}>
      <Text style={styles.celebTitle}>🎉 Grattis! 🎉</Text>
      <Text style={styles.celebSub}>Du klarade alla {MAX_LEVELS} nivåer!</Text>
      <Text style={styles.scoreText}>⭐ {score} rätta svar</Text>
      <Text style={styles.feedbackText}>{msg}</Text>
      <TouchableOpacity style={styles.startBtn} onPress={onRestart} activeOpacity={0.8}>
        <Text style={styles.startBtnText}>SPELA IGEN! 🚀</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Too few words screen ───────────────────────────────────────────────────────
function TooFewWordsScreen() {
  return (
    <View style={styles.centerScreen}>
      <Text style={styles.celebTitle}>⚠️</Text>
      <Text style={styles.celebSub}>Minst 4 glosor behövs för att spela.</Text>
      <Text style={[styles.feedbackText, { marginTop: 12 }]}>
        Be en vuxen lägga till glosor via admin-sidan.
      </Text>
    </View>
  );
}

// ── Game screen ────────────────────────────────────────────────────────────────
function GameScreen({ words: wordProp, onComplete }) {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentWord, setCurrentWord] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [wordKey, setWordKey] = useState(0);

  const wordsShuffled = useRef(shuffle(wordProp));
  const wordIndex = useRef(0);
  const correctInRound = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const levelRef = useRef(1);
  const activeRef = useRef(true);
  // Mirror of feedback state — lets handleMiss read current value synchronously
  const feedbackRef = useRef(null);

  function setFeedbackSync(val) {
    feedbackRef.current = val;
    setFeedback(val);
  }

  const nextWord = useCallback((_lvl) => {
    if (!activeRef.current) return;
    if (wordIndex.current >= wordsShuffled.current.length) {
      wordsShuffled.current = shuffle(wordProp);
      wordIndex.current = 0;
    }
    const w = wordsShuffled.current[wordIndex.current++];
    setCurrentWord(w);
    setChoices(getChoices(w, wordProp));
    setFeedbackSync(null);
    setWordKey((k) => k + 1);
  }, [wordProp]);

  useEffect(() => {
    nextWord(1);
    return () => { activeRef.current = false; };
  }, []);

  // Called when word falls past the bottom without an answer
  const handleMiss = useCallback(() => {
    if (!activeRef.current || feedbackRef.current !== null) return;
    streakRef.current = 0;
    setStreak(0);
    setFeedbackSync("miss");
    setTimeout(() => nextWord(levelRef.current), 900);
  }, [nextWord]);

  const handleChoice = useCallback((choice) => {
    if (!activeRef.current || feedbackRef.current !== null) return;

    if (choice.sv === currentWord.sv) {
      // Correct answer
      scoreRef.current += 1;
      setScore(scoreRef.current);
      streakRef.current += 1;
      setStreak(streakRef.current);
      correctInRound.current += 1;

      if (correctInRound.current >= wordProp.length) {
        // Round complete → level up
        correctInRound.current = 0;
        const newLevel = levelRef.current + 1;
        levelRef.current = newLevel;
        setLevel(newLevel);
        wordsShuffled.current = shuffle(wordProp);
        wordIndex.current = 0;
        setFeedbackSync("levelup");

        if (newLevel > MAX_LEVELS) {
          activeRef.current = false;
          setTimeout(() => onComplete(scoreRef.current), 1500);
        } else {
          setTimeout(() => nextWord(newLevel), 1300);
        }
      } else {
        const enc = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        setFeedbackSync(enc);
        setTimeout(() => nextWord(levelRef.current), 700);
      }
    } else {
      // Wrong answer
      streakRef.current = 0;
      setStreak(0);
      setFeedbackSync("miss");
      setTimeout(() => nextWord(levelRef.current), 900);
    }
  }, [currentWord, nextWord, onComplete, wordProp]);

  return (
    <View style={styles.gameContainer}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>⭐ {score}</Text>
        <Text style={styles.hudLevel}>LEVEL {level}</Text>
        <Text style={styles.hudText}>🔥 {streak}</Text>
      </View>

      {/* Fall zone */}
      <View style={styles.fallZone}>
        {currentWord && feedback === null && (
          <FallingWord
            key={wordKey}
            word={currentWord}
            onMiss={handleMiss}
            fallDuration={getFallDuration(level)}
          />
        )}

        {feedback && feedback !== "levelup" && (
          <Text style={feedback === "miss" ? styles.missFlash : styles.correctFlash}>
            {feedback === "miss" ? "Prova igen! 💙" : feedback}
          </Text>
        )}

        {feedback === "levelup" && (
          <View style={styles.levelUpContainer}>
            <Text style={styles.levelUpText}>🚀 LEVEL {level}!</Text>
            <Text style={styles.levelUpSub}>Snabbare nu!</Text>
          </View>
        )}
      </View>

      {/* Answer buttons */}
      <View style={styles.choicesContainer}>
        {choices.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.choiceBtn, { backgroundColor: CHOICE_COLORS[i] }]}
            onPress={() => handleChoice(c)}
            activeOpacity={0.75}
          >
            <Text style={styles.choiceText}>{c.sv}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── App root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [words, setWords] = useState([]);
  const [finalScore, setFinalScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    loadWords().then((w) => {
      setWords(w);
      setScreen("game");
    });
  }, []);

  function restartGame() {
    loadWords().then((w) => {
      setWords(w);
      setGameKey((k) => k + 1);
      setScreen("game");
    });
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {screen === "loading" && (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#FFD93D" />
        </View>
      )}

      {screen === "game" && words.length < 4 && <TooFewWordsScreen />}

      {screen === "game" && words.length >= 4 && (
        <GameScreen
          key={gameKey}
          words={words}
          onComplete={(s) => {
            setFinalScore(s);
            setScreen("celebrate");
          }}
        />
      )}

      {screen === "celebrate" && (
        <CelebrationScreen score={finalScore} onRestart={restartGame} />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#1a1a2e",
  },
  celebTitle: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFD93D",
    marginBottom: 8,
    textShadowColor: "#ff6b6b",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  celebSub: {
    fontSize: 20,
    color: "#c0c0e0",
    marginBottom: 28,
    textAlign: "center",
  },
  scoreText: {
    fontSize: 28,
    color: "#FFD93D",
    fontWeight: "bold",
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 22,
    color: "#c0c0e0",
    marginBottom: 36,
    textAlign: "center",
  },
  startBtn: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 50,
    elevation: 6,
    shadowColor: "#ff6b6b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  startBtnText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
  },
  // Game
  gameContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
  },
  hudText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD93D",
  },
  hudLevel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#4ECDC4",
    letterSpacing: 1,
    alignSelf: "center",
  },
  fallZone: {
    flex: 1,
    position: "relative",
  },
  fallingTile: {
    position: "absolute",
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#4ECDC4",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  fallingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1,
  },
  correctFlash: {
    position: "absolute",
    alignSelf: "center",
    top: "35%",
    fontSize: 32,
    fontWeight: "900",
    color: "#6BCB77",
    textAlign: "center",
  },
  missFlash: {
    position: "absolute",
    alignSelf: "center",
    top: "35%",
    fontSize: 30,
    fontWeight: "900",
    color: "#4ECDC4",
    textAlign: "center",
  },
  levelUpContainer: {
    position: "absolute",
    alignSelf: "center",
    top: "28%",
    alignItems: "center",
  },
  levelUpText: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFD93D",
    textShadowColor: "#ff6b6b",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  levelUpSub: {
    fontSize: 22,
    color: "#4ECDC4",
    fontWeight: "bold",
    marginTop: 8,
  },
  choicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 14,
    gap: 12,
    justifyContent: "center",
    paddingBottom: 28,
  },
  choiceBtn: {
    width: (SCREEN_W - 52) / 2,
    paddingVertical: 22,
    borderRadius: 18,
    alignItems: "center",
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  choiceText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
});
