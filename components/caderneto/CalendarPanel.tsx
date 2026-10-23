import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Note } from "../../lib/caderneto/types";
import { calendarDayKey, formatDate, type DateFormat } from "../../lib/caderneto/date";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ZONES = [
  { label: "Brasília", zone: "America/Sao_Paulo" }, { label: "Nova York", zone: "America/New_York" },
  { label: "Los Angeles", zone: "America/Los_Angeles" }, { label: "Cidade do México", zone: "America/Mexico_City" },
  { label: "Toronto", zone: "America/Toronto" }, { label: "Londres", zone: "Europe/London" },
  { label: "Lisboa", zone: "Europe/Lisbon" }, { label: "Paris", zone: "Europe/Paris" },
  { label: "Joanesburgo", zone: "Africa/Johannesburg" }, { label: "Dubai", zone: "Asia/Dubai" },
  { label: "Nova Délhi", zone: "Asia/Kolkata" }, { label: "Singapura", zone: "Asia/Singapore" },
  { label: "Tóquio", zone: "Asia/Tokyo" }, { label: "Seul", zone: "Asia/Seoul" },
  { label: "Sydney", zone: "Australia/Sydney" }, { label: "Auckland", zone: "Pacific/Auckland" },
];

export function CalendarPanel({ notes, timezone, onChangeTimezone, onOpenNote, weekStartsOn = 0, dateFormat = "dd/MM/yyyy", dark = false }: { notes: Note[]; timezone: string; onChangeTimezone: (zone: string) => void; onOpenNote: (note: Note) => void; weekStartsOn?: 0 | 1; dateFormat?: DateFormat; dark?: boolean }) {
  const colors = dark ? { background: "#191719", card: "#272328", text: "#F7F2F4", muted: "#B9AFB5", line: "#3D363B", pink: "#F2AFC3", active: "#593544" } : { background: "#FFFFFF", card: "#F8F5F6", text: "#211E21", muted: "#827981", line: "#EFE8EB", pink: "#A64C6B", active: "#F7DCE5" };
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date());
  const [clock, setClock] = useState(0);
  useEffect(() => { const firstTick = setTimeout(() => setClock(Date.now()), 0); const timer = setInterval(() => setClock(Date.now()), 30_000); return () => { clearTimeout(firstTick); clearInterval(timer); }; }, []);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const offset = (first - weekStartsOn + 7) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  }, [month, weekStartsOn]);
  const selectedNoon = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12);
  const selectedKey = calendarDayKey(selectedNoon, timezone);
  const selectedNotes = notes.filter(note => calendarDayKey(note.updatedAt, timezone) === selectedKey).sort((a, b) => b.updatedAt - a.updatedAt);
  const weekdays = weekStartsOn ? [...WEEKDAYS.slice(1), WEEKDAYS[0]] : WEEKDAYS;
  const displayZone = ZONES.find(item => item.zone === timezone)?.label ?? timezone.split("/").pop()?.replaceAll("_", " ") ?? "Local";
  const changeMonth = (amount: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const todayKey = clock ? calendarDayKey(clock, timezone) : "";
  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.heading, { color: colors.text }]}>Calendário</Text>
      <View style={styles.zoneHeader}><Ionicons name="globe-outline" size={18} color={colors.pink} /><Text style={[styles.zoneText, { color: colors.muted }]}>Horários do mundo · principal: {displayZone}</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clocks}>
        {ZONES.map(item => <Pressable key={item.zone} onPress={() => onChangeTimezone(item.zone)} style={[styles.clockCard, { backgroundColor: timezone === item.zone ? colors.active : colors.card }]}>
          <Text style={[styles.city, { color: timezone === item.zone ? colors.pink : colors.muted }]}>{item.label}</Text>
          <Text style={[styles.time, { color: colors.text }]}>{clock ? new Intl.DateTimeFormat("pt-BR", { timeZone: item.zone, hour: "2-digit", minute: "2-digit" }).format(clock) : "--:--"}</Text>
        </Pressable>)}
      </ScrollView>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => changeMonth(-1)} style={[styles.arrow, { backgroundColor: colors.card }]}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: timezone }).format(new Date(month.getFullYear(), month.getMonth(), 15, 12))}</Text>
        <Pressable onPress={() => changeMonth(1)} style={[styles.arrow, { backgroundColor: colors.card }]}><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable>
      </View>
      <View style={styles.grid}>
        {weekdays.map(day => <Text key={day} style={[styles.weekday, { color: colors.muted }]}>{day}</Text>)}
        {days.map((day, index) => {
          if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
          const key = calendarDayKey(new Date(month.getFullYear(), month.getMonth(), day, 12), timezone);
          const hasNote = notes.some(note => calendarDayKey(note.updatedAt, timezone) === key);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          return <Pressable key={`day-${day}`} onPress={() => setSelected(new Date(month.getFullYear(), month.getMonth(), day, 12))} style={styles.dayCell}>
            <View style={[styles.dayBubble, isSelected && { backgroundColor: colors.pink }, isToday && !isSelected && { borderColor: colors.pink, borderWidth: 1 }]}><Text style={[styles.dayNumber, { color: colors.text }, isSelected && styles.dayNumberSelected]}>{day}</Text></View>
            {hasNote && <View style={[styles.noteDot, { backgroundColor: colors.pink }]} />}
          </Pressable>;
        })}
      </View>
      <View style={styles.agendaHeader}><Text style={[styles.agendaTitle, { color: colors.text }]}>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: timezone }).format(selectedNoon)} · {formatDate(selectedNoon, dateFormat, timezone)}</Text><Text style={[styles.agendaCount, { color: colors.muted }]}>{selectedNotes.length} notas</Text></View>
      {selectedNotes.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Nenhuma nota nesta data. Suas notas aparecerão aqui.</Text> : selectedNotes.map(note => <Pressable key={note.id} onPress={() => onOpenNote(note)} style={[styles.noteRow, { borderBottomColor: colors.line }]}><View style={[styles.noteIcon, { backgroundColor: colors.card }]}><Ionicons name={note.locked ? "lock-closed" : "document-text-outline"} size={19} color={colors.pink} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.noteTitle, { color: colors.text }]}>{note.locked ? "Nota protegida" : note.title || "Nota sem título"}</Text><Text numberOfLines={1} style={[styles.noteExcerpt, { color: colors.muted }]}>{note.locked ? "Toque e informe o PIN" : note.content || "Toque para abrir"}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 34 },
  heading: { fontSize: 29, lineHeight: 36, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", marginBottom: 14 },
  zoneHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 9 }, zoneText: { fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  clocks: { gap: 9, paddingBottom: 13 }, clockCard: { width: 104, height: 64, borderRadius: 15, justifyContent: "center", paddingHorizontal: 12 }, city: { fontSize: 12, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, time: { marginTop: 3, fontSize: 18, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  monthHeader: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 }, monthTitle: { fontSize: 20, fontWeight: "700", textTransform: "capitalize", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, arrow: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", marginTop: 5 }, weekday: { width: "14.2857%", textAlign: "center", fontSize: 12, paddingVertical: 7, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, dayCell: { width: "14.2857%", height: 48, alignItems: "center", justifyContent: "center" }, dayBubble: { width: 34, height: 34, borderRadius: 18, alignItems: "center", justifyContent: "center" }, dayNumber: { fontSize: 15, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, dayNumberSelected: { fontWeight: "800" }, noteDot: { width: 4, height: 4, borderRadius: 3, position: "absolute", bottom: 2 },
  agendaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 }, agendaTitle: { fontSize: 17, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", textTransform: "capitalize", flex: 1 }, agendaCount: { fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginLeft: 8 }, empty: { fontSize: 15, lineHeight: 22, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), paddingVertical: 16 },
  noteRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth }, noteIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center" }, noteTitle: { fontSize: 15, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, noteExcerpt: { fontSize: 12, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 2 },
});
