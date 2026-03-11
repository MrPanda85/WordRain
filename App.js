import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { loadWords, saveWords } from "./fetchWords";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BASE_FALL_DURATION = 4000;
const SPEED_STEP = 400;
const MIN_FALL_DURATION = 1200;
const LIVES_MAX = 3;

function getFallDuration(level) {
  return Math.max(MIN_FALL_DURATION, BASE_FALL_DURATION - (level - 1) * SPEED_STEP);
}
const CHOICE_COLORS = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77"];

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
  const left = useRef(Math.random() * (SCREEN_W - 130) + 10).current;

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: SCREEN_H * 0.55,
      duration: fallDuration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onMiss();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.fallingTile,
        { left, transform: [{ translateY: fallAnim }] },
      ]}
    >
      <Text style={styles.fallingText}>{word.en}</Text>
    </Animated.View>
  );
}

// ── Start screen ───────────────────────────────────────────────────────────────
function StartScreen({ onStart, onAdmin }) {
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  function handleTitlePress() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      onAdmin();
    } else {
      tapTimer.current = setTimeout(() => {
        tapCount.current = 0;
      }, 1500);
    }
  }

  return (
    <View style={styles.centerScreen}>
      <TouchableOpacity onPress={handleTitlePress} activeOpacity={1}>
        <Text style={styles.title}>🌟 Word Rain 🌟</Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>Tryck på rätt svensk översättning!</Text>
      <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.8}>
        <Text style={styles.startBtnText}>SPELA!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.adminLink} onPress={onAdmin}>
        <Text style={styles.adminLinkText}>⚙️ Hantera glosor</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Game over screen ───────────────────────────────────────────────────────────
function GameOverScreen({ score, level, onRestart }) {
  return (
    <View style={styles.centerScreen}>
      <Text style={styles.gameOverTitle}>Game Over!</Text>
      <Text style={styles.scoreText}>⭐ {score} poäng</Text>
      <Text style={styles.scoreText}>🚀 Level {level}</Text>
      <Text style={styles.feedbackText}>
        {level >= 4 ? "🏆 Fantastiskt bra!" : level >= 2 ? "⭐ Bra jobbat!" : "💪 Öva lite mer!"}
      </Text>
      <TouchableOpacity style={styles.startBtn} onPress={onRestart}>
        <Text style={styles.startBtnText}>SPELA IGEN!</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Admin screen ───────────────────────────────────────────────────────────────
function AdminScreen({ words, onBack, onWordsChange }) {
  const [enInput, setEnInput] = useState("");
  const [svInput, setSvInput] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    const en = enInput.trim().toLowerCase();
    const sv = svInput.trim().toLowerCase();
    if (!en || !sv) {
      setError("Fyll i båda fälten.");
      return;
    }
    if (words.some((w) => w.en === en)) {
      setError("Det engelska ordet finns redan.");
      return;
    }
    const updated = [...words, { en, sv }];
    await saveWords(updated);
    onWordsChange(updated);
    setEnInput("");
    setSvInput("");
    setError("");
  }

  async function handleDelete(en) {
    const updated = words.filter((w) => w.en !== en);
    await saveWords(updated);
    onWordsChange(updated);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#1a1a2e" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.adminHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.adminTitle}>Hantera glosor</Text>
        <Text style={styles.adminCount}>{words.length} st</Text>
      </View>

      {/* Word list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {words.map((w) => (
          <View key={w.en} style={styles.wordRow}>
            <Text style={styles.wordRowText}>
              <Text style={{ color: "#4ECDC4", fontWeight: "bold" }}>{w.en}</Text>
              {"  →  "}
              <Text style={{ color: "#FFD93D" }}>{w.sv}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(w.en)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add form */}
      <View style={styles.addForm}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Engelska"
            placeholderTextColor="#666"
            value={enInput}
            onChangeText={(t) => { setEnInput(t); setError(""); }}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Svenska"
            placeholderTextColor="#666"
            value={svInput}
            onChangeText={(t) => { setSvInput(t); setError(""); }}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ Lägg till</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main game screen ───────────────────────────────────────────────────────────
function GameScreen({ words: wordProp, onGameOver }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_MAX);
  const [level, setLevel] = useState(1);
  const [currentWord, setCurrentWord] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [wordKey, setWordKey] = useState(0);

  const words = useRef(shuffle(wordProp));
  const wordIndex = useRef(0);
  const correctInRound = useRef(0);
  const livesRef = useRef(LIVES_MAX);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const activeRef = useRef(true);

  const nextWord = useCallback((currentLevel) => {
    if (!activeRef.current) return;
    if (wordIndex.current >= words.current.length) {
      words.current = shuffle(wordProp);
      wordIndex.current = 0;
    }
    const w = words.current[wordIndex.current++];
    setCurrentWord(w);
    setChoices(getChoices(w, wordProp));
    setFeedback(null);
    setWordKey((k) => k + 1);
  }, []);

  useEffect(() => {
    nextWord(1);
    return () => {
      activeRef.current = false;
    };
  }, []);

  const handleMiss = useCallback(() => {
    if (!activeRef.current) return;
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);
    setFeedback("wrong");
    if (newLives <= 0) {
      activeRef.current = false;
      setTimeout(() => onGameOver(scoreRef.current, levelRef.current), 800);
    } else {
      setTimeout(() => nextWord(levelRef.current), 600);
    }
  }, [nextWord, onGameOver]);

  const handleChoice = useCallback(
    (choice) => {
      if (!activeRef.current || feedback) return;
      if (choice.sv === currentWord.sv) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        correctInRound.current += 1;

        if (correctInRound.current >= wordProp.length) {
          // Level up!
          correctInRound.current = 0;
          const newLevel = levelRef.current + 1;
          levelRef.current = newLevel;
          setLevel(newLevel);
          setFeedback("levelup");
          words.current = shuffle(wordProp);
          wordIndex.current = 0;
          setTimeout(() => nextWord(newLevel), 1200);
        } else {
          setFeedback("correct");
          setTimeout(() => nextWord(levelRef.current), 500);
        }
      } else {
        handleMiss();
      }
    },
    [currentWord, feedback, handleMiss, nextWord, wordProp]
  );

  const hearts = Array.from({ length: LIVES_MAX }, (_, i) =>
    i < lives ? "❤️" : "🖤"
  );

  return (
    <View style={styles.gameContainer}>
      <View style={styles.hud}>
        <Text style={styles.hudText}>⭐ {score}</Text>
        <Text style={styles.hudLevel}>LEVEL {level}</Text>
        <Text style={styles.hudText}>{hearts.join(" ")}</Text>
      </View>

      <View style={styles.fallZone}>
        {currentWord && feedback !== "levelup" && (
          <FallingWord
            key={wordKey}
            word={currentWord}
            onMiss={handleMiss}
            fallDuration={getFallDuration(level)}
          />
        )}
        {feedback === "correct" && (
          <Text style={styles.correctFlash}>✅ Rätt!</Text>
        )}
        {feedback === "wrong" && (
          <Text style={styles.wrongFlash}>❌ Fel!</Text>
        )}
        {feedback === "levelup" && (
          <View style={styles.levelUpContainer}>
            <Text style={styles.levelUpText}>🚀 LEVEL {level}!</Text>
            <Text style={styles.levelUpSub}>Snabbare nu!</Text>
          </View>
        )}
      </View>

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
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [words, setWords] = useState([]);

  useEffect(() => {
    loadWords().then((w) => {
      setWords(w);
      setScreen("start");
    });
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      {screen === "loading" && (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#FFD93D" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Laddar glosor...</Text>
        </View>
      )}
      {screen === "start" && (
        <StartScreen
          onStart={() => {
            loadWords().then((w) => {
              setWords(w);
              setScreen("game");
            });
          }}
          onAdmin={() => setScreen("admin")}
        />
      )}
      {screen === "admin" && (
        <AdminScreen
          words={words}
          onBack={() => setScreen("start")}
          onWordsChange={(updated) => setWords(updated)}
        />
      )}
      {screen === "game" && (
        <GameScreen
          words={words}
          onGameOver={(s, l) => {
            setFinalScore(s);
            setFinalLevel(l);
            setScreen("gameover");
          }}
        />
      )}
      {screen === "gameover" && (
        <GameOverScreen
          score={finalScore}
          level={finalLevel}
          onRestart={() => setScreen("game")}
        />
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
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFD93D",
    marginBottom: 12,
    textShadowColor: "#ff6b6b",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#c0c0e0",
    marginBottom: 40,
    textAlign: "center",
  },
  startBtn: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 48,
    paddingVertical: 18,
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
  gameOverTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FF6B6B",
    marginBottom: 12,
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
  },
  // Admin
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4e",
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: "#4ECDC4",
    fontSize: 16,
    fontWeight: "bold",
  },
  adminTitle: {
    color: "#FFD93D",
    fontSize: 18,
    fontWeight: "900",
  },
  adminCount: {
    color: "#666",
    fontSize: 14,
    minWidth: 40,
    textAlign: "right",
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16213e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  wordRowText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  deleteBtn: {
    paddingLeft: 12,
  },
  deleteBtnText: {
    fontSize: 20,
  },
  addForm: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a2a4e",
    backgroundColor: "#1a1a2e",
  },
  errorText: {
    color: "#FF6B6B",
    marginBottom: 8,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#2a2a4e",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: "#6BCB77",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
  },
  adminLink: {
    marginTop: 28,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  adminLinkText: {
    color: "#666",
    fontSize: 15,
    textDecorationLine: "underline",
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  hudText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFD93D",
  },
  hudLevel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4ECDC4",
    letterSpacing: 1,
  },
  levelUpContainer: {
    position: "absolute",
    alignSelf: "center",
    top: "30%",
    alignItems: "center",
  },
  levelUpText: {
    fontSize: 48,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  fallingText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1,
  },
  correctFlash: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    fontSize: 36,
    fontWeight: "900",
    color: "#6BCB77",
  },
  wrongFlash: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    fontSize: 36,
    fontWeight: "900",
    color: "#FF6B6B",
  },
  choicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 10,
    justifyContent: "center",
    paddingBottom: 24,
  },
  choiceBtn: {
    width: (SCREEN_W - 48) / 2,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
  },
  choiceText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
});
