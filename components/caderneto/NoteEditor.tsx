import { useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import type { Note } from "../../lib/caderneto/types";

type Props = {
  note: Note;
  notebookLabel: string;
  dark: boolean;
  dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
  onClose: () => void;
  onSave: (note: Note) => void;
  onMenu: (note: Note) => void;
  onShare: (note: Note) => void;
  onMoveNotebook: (note: Note) => void;
  onAddImage: () => Promise<string | null>;
  onAddAudio: () => Promise<{ uri: string; name?: string } | null>;
  onDraw: () => Promise<string | null>;
  onReminder: (note: Note) => void;
};

export function NoteEditor({ note, notebookLabel, dark, dateFormat, onClose, onSave, onMenu, onShare, onMoveNotebook, onAddImage, onAddAudio, onDraw, onReminder }: Props) {
  const [draft, setDraft] = useState(note);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [formatOpen, setFormatOpen] = useState(false);
  const [hint, setHint] = useState("");
  const input = useRef<TextInput>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const c = dark ? palette.dark : palette.light;

  const changeContent = (value: string) => {
    if (value !== draft.content) {
      undoStack.current = [...undoStack.current.slice(-30), draft.content];
      redoStack.current = [];
      setDraft(current => ({ ...current, content: value, updatedAt: Date.now() }));
    }
  };
  const undo = () => {
    const previous = undoStack.current.pop();
    if (previous !== undefined) { redoStack.current.push(draft.content); setDraft(current => ({ ...current, content: previous, updatedAt: Date.now() })); }
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (next !== undefined) { undoStack.current.push(draft.content); setDraft(current => ({ ...current, content: next, updatedAt: Date.now() })); }
  };
  const insert = (value: string, wrap?: string) => {
    const start = selection.start ?? draft.content.length;
    const end = selection.end ?? start;
    const inserted = wrap ? `${wrap}${draft.content.slice(start, end) || "texto"}${wrap}` : value;
    const next = draft.content.slice(0, start) + inserted + draft.content.slice(end);
    changeContent(next);
    const cursor = start + inserted.length;
    setSelection({ start: cursor, end: cursor });
    requestAnimationFrame(() => input.current?.focus());
  };
  const saveAndClose = () => { onSave({ ...draft, title: draft.title.trim(), updatedAt: Date.now() }); onClose(); };
  const dateLabel = () => {
    const d = new Date(draft.updatedAt);
    const day = String(d.getDate()).padStart(2, "0"); const month = String(d.getMonth() + 1).padStart(2, "0"); const year = d.getFullYear();
    const date = dateFormat === "MM/dd/yyyy" ? `${month}/${day}/${year}` : dateFormat === "yyyy-MM-dd" ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
    return `${date}, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };
  const fontSizes = [16, 18, 22, 26];
  const textColors = dark ? ["#AUTO", "#F8F4F6", "#F5AFC5", "#BFD7FF", "#BDEBCF"] : ["#AUTO", "#191719", "#8B405A", "#3458A4", "#236548"];
  const updateStyle = (patch: Partial<Pick<Note, "fontSize" | "bold" | "italic" | "textColor" | "color">>) => setDraft(current => ({ ...current, ...patch, updatedAt: Date.now() }));
  const cycleFontSize = () => updateStyle({ fontSize: fontSizes[(fontSizes.indexOf(draft.fontSize) + 1) % fontSizes.length] });
  const cycleTextColor = () => updateStyle({ textColor: textColors[(textColors.indexOf(draft.textColor) + 1) % textColors.length] });

  return (
    <Modal visible animationType="slide" onRequestClose={saveAndClose}>
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.topbar, { borderBottomColor: c.border }]}>
          <Action icon="checkmark" label="Salvar e fechar" onPress={saveAndClose} primary={c.pink} color={c.text} />
          <Action icon="arrow-undo-outline" label="Desfazer" onPress={undo} color={c.text} />
          <Action icon="arrow-redo-outline" label="Refazer" onPress={redo} color={c.text} />
          <Action icon="share-outline" label="Compartilhar" onPress={() => { onSave(draft); onShare(draft); onClose(); }} color={c.text} />
          <Action icon="ellipsis-vertical" label="Mais opções" onPress={() => { onSave(draft); onMenu(draft); onClose(); }} color={c.text} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.metaRow}>
            <Pressable onPress={() => onReminder(draft)}><Text style={[styles.meta, { color: c.muted }]}>{dateLabel()}  ✎</Text></Pressable>
            <Pressable onPress={() => { onSave(draft); onMoveNotebook(draft); onClose(); }}><Text style={[styles.folder, { color: c.pinkDark }]} numberOfLines={1}>{notebookLabel || "Sem caderno"}  ▾</Text></Pressable>
          </View>
          <TextInput value={draft.title} onChangeText={title => setDraft(current => ({ ...current, title, updatedAt: Date.now() }))} placeholder="Título da nota" placeholderTextColor={c.muted} style={[styles.title, { color: c.text }]} returnKeyType="next" onSubmitEditing={() => input.current?.focus()} />
          <TextInput ref={input} value={draft.content} onChangeText={changeContent} onSelectionChange={event => setSelection(event.nativeEvent.selection)} selection={selection} placeholder="Escreva suas ideias aqui…" placeholderTextColor={c.muted} multiline textAlignVertical="top" style={[styles.body, { color: draft.textColor === "#AUTO" ? c.text : draft.textColor, backgroundColor: draft.color === "#FFFFFF" ? c.background : draft.color, fontSize: draft.fontSize || 18, fontWeight: draft.bold ? "700" : "400", fontStyle: draft.italic ? "italic" : "normal" }]} />
          {draft.attachments.length > 0 && <View style={styles.attachments}>{draft.attachments.map(item => item.kind === "image" ? <Image key={item.id} source={{ uri: item.uri }} style={styles.attachment} /> : item.kind === "drawing" ? <View key={item.id} style={styles.attachment}><SvgXml xml={item.uri} width="100%" height="100%" /></View> : <View key={item.id} style={[styles.audioAttachment, { backgroundColor: c.card }]}><Ionicons name={item.kind === "audio" ? "musical-notes" : "document-outline"} size={20} color={c.pinkDark} /><Text numberOfLines={1} style={{ color: c.text, maxWidth: 150 }}>{item.name || (item.kind === "audio" ? "Áudio" : "Anexo")}</Text></View>)}</View>}
          {!!hint && <Text style={[styles.hint, { color: c.muted }]}>{hint}</Text>}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.toolbar, { backgroundColor: c.card, borderTopColor: c.border }]} contentContainerStyle={styles.toolbarContent}>
          <Tool icon="text" label="Formatação" onPress={() => setFormatOpen(value => !value)} c={c} />
          <Tool icon="list" label="Marcadores" onPress={() => insert("• ")} c={c} />
          <Tool icon="list-outline" label="Lista numerada" onPress={() => insert("1. ")} c={c} />
          <Tool icon="checkbox-outline" label="Checklist" onPress={() => insert("☐ ")} c={c} />
          <Tool icon="mic-outline" label="Ditado" onPress={() => { input.current?.focus(); setHint("Use o microfone do teclado do celular para ditar o texto."); }} c={c} />
          <Tool icon="image-outline" label="Imagem" onPress={async () => { const uri = await onAddImage(); if (uri) setDraft(current => ({ ...current, attachments: [...current.attachments, { id: `${Date.now()}`, uri, kind: "image" }] })); }} c={c} />
          <Tool icon="musical-notes-outline" label="Áudio" onPress={async () => { const audio = await onAddAudio(); if (audio) setDraft(current => ({ ...current, attachments: [...current.attachments, { id: `${Date.now()}`, uri: audio.uri, kind: "audio", name: audio.name }] })); }} c={c} />
          <Tool icon="pencil-outline" label="Desenho" onPress={async () => { const uri = await onDraw(); if (uri) setDraft(current => ({ ...current, attachments: [...current.attachments, { id: `${Date.now()}`, uri, kind: "drawing" }] })); }} c={c} />
          <Tool icon="grid-outline" label="Tabela" onPress={() => insert("\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n|  |  |\n")} c={c} />
        </ScrollView>
        {formatOpen && <View style={[styles.formatRow, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <Tool icon="barbell-outline" label={draft.bold ? "Negrito ✓" : "Negrito"} onPress={() => updateStyle({ bold: !draft.bold })} c={c} />
          <Tool icon="text-outline" label={draft.italic ? "Itálico ✓" : "Itálico"} onPress={() => updateStyle({ italic: !draft.italic })} c={c} />
          <Tool icon="text-outline" label={`Tamanho ${draft.fontSize || 18}`} onPress={cycleFontSize} c={c} />
          <Tool icon="color-palette-outline" label="Cor do texto" onPress={cycleTextColor} c={c} />
          <Tool icon="color-palette-outline" label="Cor da nota" onPress={() => setDraft(current => ({ ...current, color: current.color === "#FFF1F5" ? "#FFFFFF" : "#FFF1F5" }))} c={c} />
        </View>}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Action({ icon, label, onPress, color, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color: string; primary?: string }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.action, primary ? { backgroundColor: primary } : null]}><Ionicons name={icon} size={22} color={color} /></Pressable>;
}
function Tool({ icon, label, onPress, c }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; c: typeof palette.light }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={styles.tool}><Ionicons name={icon} size={21} color={c.text} /><Text style={[styles.toolLabel, { color: c.muted }]}>{label}</Text></Pressable>;
}
const palette = {
  light: { background: "#FFFFFF", card: "#FFF8FA", text: "#191719", muted: "#827A80", border: "#EFE8EB", pink: "#F2AFC3", pinkDark: "#B7486E" },
  dark: { background: "#191719", card: "#272328", text: "#F8F4F6", muted: "#B9AFB5", border: "#3C353B", pink: "#F2AFC3", pinkDark: "#F5AFC5" },
};
const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === "ios" ? 45 : 30 },
  topbar: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  action: { width: 42, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  scroll: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24, flexGrow: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  meta: { fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, folder: { fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), maxWidth: 180 },
  title: { fontSize: 26, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", paddingVertical: 9 },
  body: { fontSize: 18, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), lineHeight: 28, minHeight: 300, paddingTop: 9 },
  attachments: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 }, attachment: { width: 102, height: 120, borderRadius: 12, overflow: "hidden" }, audioAttachment: { minWidth: 120, height: 46, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11 },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  toolbar: { maxHeight: 76, borderTopWidth: StyleSheet.hairlineWidth }, toolbarContent: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4, paddingBottom: 5 },
  formatRow: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: StyleSheet.hairlineWidth },
  tool: { alignItems: "center", justifyContent: "center", minWidth: 42, paddingHorizontal: 5, paddingVertical: 4 }, toolLabel: { fontSize: 9, marginTop: 3, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
});
