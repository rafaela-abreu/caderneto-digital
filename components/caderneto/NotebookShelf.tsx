import { Platform, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Notebook } from "../../lib/caderneto/types";

const covers = ["#F6E5EA", "#E9E5F7", "#E7F1ED", "#F6EFDC", "#E4EEF5", "#F2E5DD"];

type Props = {
  notebooks: Notebook[];
  noteCounts: Record<string, number>;
  createLabel: string;
  dark: boolean;
  onCreate: () => void;
  onOpen: (notebook: Notebook) => void;
  onLongPress: (notebook: Notebook) => void;
};

export function NotebookShelf({ notebooks, noteCounts, createLabel, dark, onCreate, onOpen, onLongPress }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(138, Math.min(210, (width - 54) / 2));
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.grid, { backgroundColor: dark ? "#191719" : "#FFFFFF" }]}>
      <Pressable onPress={onCreate} style={[styles.card, styles.addCard, { width: cardWidth, backgroundColor: dark ? "#272328" : "#FFFCFD", borderColor: dark ? "#554950" : "#D6CBD0" }]}>
        <View style={styles.addIcon}><Ionicons name="add" size={37} color="#1C1A1D" /></View>
        <Text style={[styles.addText, { color: dark ? "#F7F2F4" : "#242125" }]}>{createLabel}</Text>
      </Pressable>
      {notebooks.map((notebook, index) => (
        <Pressable key={notebook.id} onPress={() => onOpen(notebook)} onLongPress={() => onLongPress(notebook)} delayLongPress={420} style={[styles.card, { width: cardWidth }]}>
          <View style={[styles.cover, { backgroundColor: dark ? "#3A3338" : covers[index % covers.length], borderColor: dark ? "#5A4F55" : "rgba(34,28,33,0.12)" }]}>
            {notebook.coverUri ? <Image source={{ uri: notebook.coverUri }} style={styles.coverImage} resizeMode="cover" /> : (
              <>
                <View style={styles.coverStripe} />
                <Ionicons name="book-outline" size={44} color="#302A30" />
                <Text numberOfLines={1} style={styles.coverTitle}>{notebook.title}</Text>
                <View style={styles.bookmark} />
              </>
            )}
          </View>
          <Text numberOfLines={2} style={[styles.title, { color: dark ? "#F7F2F4" : "#1D1B1E" }]}>{notebook.title}</Text>
          <Text style={[styles.count, { color: dark ? "#B9AFB5" : "#827B82" }]}>{noteCounts[notebook.id] ?? 0} notas</Text>
        </Pressable>
      ))}
      {notebooks.length === 0 && <Text style={[styles.empty, { color: dark ? "#B9AFB5" : "#706870" }]}>Sua estante começa com um caderno. Toque no primeiro cartão para criar.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", gap: 14, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30 },
  card: { minHeight: 226, borderRadius: 15, paddingBottom: 9 },
  addCard: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D6CBD0", backgroundColor: "#FFFCFD", minHeight: 190 },
  addIcon: { width: 68, height: 68, borderRadius: 23, backgroundColor: "#F9E5EC", alignItems: "center", justifyContent: "center", marginBottom: 15 },
  addText: { fontSize: 16, color: "#242125", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" },
  cover: { height: 176, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative", borderColor: "rgba(34,28,33,0.12)", borderWidth: 1 },
  coverImage: { width: "100%", height: "100%" },
  coverStripe: { position: "absolute", left: 13, top: 0, bottom: 0, width: 8, backgroundColor: "rgba(255,255,255,0.38)" },
  coverTitle: { color: "#302A30", fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", textAlign: "center", marginTop: 8, paddingHorizontal: 10 },
  bookmark: { position: "absolute", top: 0, right: 18, width: 13, height: 34, backgroundColor: "#F2AFC3", borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  title: { fontSize: 16, lineHeight: 21, color: "#1D1B1E", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", textAlign: "center", marginTop: 7, minHeight: 38 },
  count: { textAlign: "center", color: "#827B82", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontSize: 12, marginTop: 1 },
  empty: { color: "#706870", fontSize: 16, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), lineHeight: 24, textAlign: "center", marginHorizontal: 18, marginTop: 20, width: "100%" },
});
