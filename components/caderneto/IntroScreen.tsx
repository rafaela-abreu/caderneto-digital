import { useEffect, useRef, useState } from "react";
import { Platform, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer } from "expo-audio";

const PINK = "#F2AFC3";

export function IntroScreen({ onFinish, soundEnabled = true }: { onFinish: () => void; soundEnabled?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [scale] = useState(() => new Animated.Value(0.88));
  const [spin] = useState(() => new Animated.Value(0));
  const finishRef = useRef(onFinish);
  const finished = useRef(false);
  const player = useAudioPlayer(require("../../assets/audio/caderneto-intro.mp3"));

  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }));
    spinLoop.start();
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const value = Math.min(100, Math.round(((Date.now() - startedAt) / 3200) * 100));
      setProgress(value);
      if (value >= 100 && !finished.current) {
        finished.current = true;
        clearInterval(timer);
        if (soundEnabled) {
          try { player.volume = 1; player.play(); } catch { /* O sistema pode impedir a reprodução automática. */ }
        }
        setTimeout(() => finishRef.current(), 550);
      }
    }, 32);
    return () => { clearInterval(timer); spinLoop.stop(); };
  }, [player, scale, spin, soundEnabled]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.mark} accessibilityLabel="Símbolo do Caderneto Digital">
          <View style={styles.pageLeft} />
          <View style={styles.pageRight} />
          <View style={styles.spine} />
          <Text style={styles.heart}>♥</Text>
        </View>
        <Text style={styles.title}>Suas mãos Merecem Descanso 🩷.</Text>
        <Text style={styles.credit}>Engenheira e Arquiteta de Software</Text>
        <Text style={styles.creditName}>Rafaela Abreu</Text>
        <View style={styles.loaderRow}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: rotation }] }]}><View style={styles.spinnerDot} /></Animated.View>
          <Text style={styles.percent}>{progress}%</Text>
        </View>
        <View style={styles.track}><View style={[styles.progress, { width: `${progress}%` }]} /></View>
        <Text style={styles.caption}>Preparando seus cadernos…</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  content: { width: "100%", alignItems: "center" },
  mark: { width: 92, height: 76, marginBottom: 34, position: "relative" },
  pageLeft: { position: "absolute", left: 5, top: 12, width: 42, height: 55, backgroundColor: "#FFF9FB", borderColor: "#29272A", borderWidth: 3, borderTopLeftRadius: 17, borderBottomLeftRadius: 10, transform: [{ rotate: "-7deg" }] },
  pageRight: { position: "absolute", right: 5, top: 12, width: 42, height: 55, backgroundColor: "#FFF9FB", borderColor: "#29272A", borderWidth: 3, borderTopRightRadius: 17, borderBottomRightRadius: 10, transform: [{ rotate: "7deg" }] },
  spine: { position: "absolute", width: 4, height: 55, left: 44, top: 14, backgroundColor: PINK, borderRadius: 4 },
  heart: { position: "absolute", top: -12, right: 4, color: PINK, fontSize: 27 },
  title: { color: "#171619", fontSize: 27, lineHeight: 36, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", textAlign: "center", marginBottom: 15 },
  credit: { color: "#343136", fontSize: 16, lineHeight: 23, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), textAlign: "center" },
  creditName: { color: "#343136", fontSize: 18, lineHeight: 25, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", textAlign: "center", marginBottom: 45 },
  loaderRow: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 17 },
  spinner: { width: 31, height: 31, borderWidth: 3, borderColor: "#F9DCE5", borderTopColor: PINK, borderRadius: 20, alignItems: "center", justifyContent: "flex-start" },
  spinnerDot: { width: 5, height: 5, borderRadius: 4, backgroundColor: PINK, marginTop: -3 },
  percent: { minWidth: 58, color: "#252328", fontSize: 21, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" },
  track: { width: "75%", maxWidth: 300, height: 8, borderRadius: 8, backgroundColor: "#F6EDF0", overflow: "hidden" },
  progress: { height: 8, borderRadius: 8, backgroundColor: PINK },
  caption: { marginTop: 13, color: "#777078", fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
});
