import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Notifications from "expo-notifications";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { captureRef } from "react-native-view-shot";
import { IntroScreen } from "./IntroScreen";
import { NotebookShelf } from "./NotebookShelf";
import { NoteEditor } from "./NoteEditor";
import { DrawingPad } from "./DrawingPad";
import { NotebookSortModal } from "./NotebookSortModal";
import { CalendarPanel } from "./CalendarPanel";
import { NoteList } from "./NoteList";
import { SettingsPanel } from "./SettingsPanel";
import { allNotebooks, createNotebook, deleteNotebookTree, duplicateNotebookTree, emptyNote, listNotes, readSettings, reorderNotebooks, saveSettings, updateNotebook, writeNote } from "../../lib/caderneto/database";
import { buildSnapshot, downloadPrivateBackup, restoreSnapshot, uploadPrivateBackup, type BackupSnapshot } from "../../lib/caderneto/google-drive";
import { DEFAULT_SETTINGS, type AppSettings, type Note, type Notebook } from "../../lib/caderneto/types";
import { formatDate, type DateFormat } from "../../lib/caderneto/date";
import type { GoogleIdentity } from "./GoogleAccountPanel";
import { keepPrivateFile } from "../../lib/caderneto/media";

type Tab = "notes" | "shelf" | "calendar" | "mine";
type FormState = { kind: "newNotebook"; parentId: string | null } | { kind: "renameNotebook"; notebook: Notebook } | { kind: "pin" } | { kind: "disablePin" } | { kind: "changePin" } | { kind: "reminder"; note: Note };
type MenuTarget = { type: "notebook"; item: Notebook } | { type: "note"; item: Note } | null;

const palette = {
  light: { background: "#FFFFFF", text: "#191719", muted: "#817980", line: "#EFE8EB", card: "#FFF9FB", pink: "#F2AFC3", pinkDark: "#A64C6B", nav: "#FFFFFF" },
  dark: { background: "#191719", text: "#F8F3F5", muted: "#B7AFB4", line: "#3C353A", card: "#272328", pink: "#F2AFC3", pinkDark: "#F0A7BE", nav: "#221F23" },
};
const secureGet = async (key: string) => { try { if (Platform.OS !== "web") return await SecureStore.getItemAsync(key); return typeof window !== "undefined" ? window.localStorage.getItem(key) : null; } catch { return null; } };
const secureSet = async (key: string, value: string) => { if (Platform.OS !== "web") return SecureStore.setItemAsync(key, value); if (typeof window !== "undefined") window.localStorage.setItem(key, value); };
const secureRemove = async (key: string) => { if (Platform.OS !== "web") return SecureStore.deleteItemAsync(key); if (typeof window !== "undefined") window.localStorage.removeItem(key); };
const localDateTimeValue = (date: Date) => { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); };
const htmlEscape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));

export function CadernetoScreen() {
  const [busy, setBusy] = useState(true);
  const [introVisible, setIntroVisible] = useState(false);
  const [ownerId, setOwnerId] = useState("device");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [allBooks, setAllBooks] = useState<Notebook[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>("shelf");
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [menuTarget, setMenuTarget] = useState<MenuTarget>(null);
  const [sortVisible, setSortVisible] = useState(false);
  const [plusVisible, setPlusVisible] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [formValue, setFormValue] = useState("");
  const [currentPinValue, setCurrentPinValue] = useState("");
  const [formCover, setFormCover] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<Note | null>(null);
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  const [drawingVisible, setDrawingVisible] = useState(false);
  const [drawingResolver, setDrawingResolver] = useState<((value: string | null) => void) | null>(null);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pendingLockedNote, setPendingLockedNote] = useState<Note | null>(null);
  const [unlockedNoteId, setUnlockedNoteId] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const shareCardRef = useRef<View>(null);
  const dark = settings.theme === "dark";
  const c = dark ? palette.dark : palette.light;
  const currentNotebook = allBooks.find(book => book.id === currentNotebookId) ?? null;
  const children = allBooks.filter(book => book.parentId === currentNotebookId).sort((a, b) => a.sortOrder - b.sortOrder);
  const currentNotes = allNotes.filter(note => note.notebookId === currentNotebookId && !note.archived && !note.trashed);
  const visibleNotes = allNotes.filter(note => !note.archived && !note.trashed && (note.locked ? !search : `${note.title} ${note.content}`.toLowerCase().includes(search.toLowerCase())));
  const activeNotes = allNotes.filter(note => !note.archived && !note.trashed);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const note of activeNotes) {
      let book = allBooks.find(item => item.id === note.notebookId);
      while (book) { result[book.id] = (result[book.id] ?? 0) + 1; book = allBooks.find(item => item.id === book?.parentId); }
    }
    return result;
  }, [activeNotes, allBooks]);

  const reload = useCallback(async (scope = ownerId) => {
    const [books, notes, prefs] = await Promise.all([allNotebooks(scope), listNotes(scope, { includeArchived: true, includeTrashed: true }), readSettings(scope)]);
    setAllBooks(books); setAllNotes(notes); setSettings(prefs);
  }, [ownerId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const savedOwner = await secureGet("caderneto.active-owner") || "device";
        const savedEmail = await secureGet("caderneto.google-email");
        const savedToken = await secureGet("caderneto.google-token");
        const [books, notes, prefs, pin] = await Promise.all([allNotebooks(savedOwner), listNotes(savedOwner, { includeArchived: true, includeTrashed: true }), readSettings(savedOwner), secureGet(`caderneto.pin.${savedOwner}`)]);
        if (!alive) return;
        setOwnerId(savedOwner); setAccountEmail(savedEmail); setDriveToken(savedToken); setAllBooks(books); setAllNotes(notes); setSettings(prefs);
        setIntroVisible(!prefs.introSeen); setPinVisible(!!(prefs.pinEnabled && pin));
      } catch (error) { console.error("Caderneto inicialização local falhou", error); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, []);

  const persistSetting = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch, ownerId };
    setSettings(next);
    await saveSettings(next);
  }, [ownerId, settings]);
  const refresh = useCallback(() => reload(ownerId), [reload, ownerId]);

  const finishIntro = useCallback(async () => {
    await persistSetting({ introSeen: true });
    setIntroVisible(false);
  }, [persistSetting]);

  const openCreateBook = (parentId = currentNotebookId) => { setFormValue(""); setFormCover(null); setForm({ kind: "newNotebook", parentId }); setPlusVisible(false); };
  const openRenameBook = (notebook: Notebook) => { setFormValue(notebook.title); setFormCover(null); setForm({ kind: "renameNotebook", notebook }); setMenuTarget(null); };
  const makeNote = async (notebookId: string | null = currentNotebookId) => {
    const note = emptyNote(ownerId, notebookId);
    await writeNote(note); setAllNotes(current => [note, ...current]); setEditingNote(note); setPlusVisible(false);
  };
  const saveEditedNote = async (note: Note) => { await writeNote(note); setAllNotes(current => [note, ...current.filter(item => item.id !== note.id)]); };
  const showForm = (next: FormState) => { setForm(next); setFormValue(next.kind === "renameNotebook" ? next.notebook.title : next.kind === "reminder" ? localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)) : ""); setCurrentPinValue(""); setFormCover(null); };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.88 });
      return result.canceled || !result.assets[0] ? null : await keepPrivateFile(result.assets[0].uri, "foto");
    } catch { Alert.alert("Galeria indisponível", "Não foi possível abrir as fotos deste aparelho."); return null; }
  };
  const chooseBookCover = async (book: Notebook) => {
    setMenuTarget(null);
    const uri = await pickPhoto();
    if (!uri) return;
    const updated = { ...book, coverUri: uri };
    await updateNotebook(updated); setAllBooks(current => current.map(item => item.id === book.id ? updated : item));
  };
  const addImageToNote = async () => await pickPhoto();
  const addAudioToNote = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return null;
      return { uri: await keepPrivateFile(result.assets[0].uri, "audio"), name: result.assets[0].name };
    } catch { Alert.alert("Áudio indisponível", "Não foi possível acessar esse arquivo de áudio."); return null; }
  };
  const openDrawing = () => new Promise<string | null>(resolve => { setDrawingResolver(() => resolve); setDrawingVisible(true); });
  const finishDrawing = (svg: string | null) => { drawingResolver?.(svg); setDrawingResolver(null); setDrawingVisible(false); };

  const handleGoogleConnected = useCallback(async (identity: GoogleIdentity) => {
    const scope = `google:${identity.subject}`;
    await Promise.all([secureSet("caderneto.active-owner", scope), secureSet("caderneto.google-email", identity.email), secureSet("caderneto.google-subject", identity.subject), secureSet("caderneto.google-token", identity.accessToken)]);
    setOwnerId(scope); setAccountEmail(identity.email); setDriveToken(identity.accessToken); setCurrentNotebookId(null); setTab("shelf");
    const [books, notes, prefs] = await Promise.all([allNotebooks(scope), listNotes(scope, { includeArchived: true, includeTrashed: true }), readSettings(scope)]);
    setAllBooks(books); setAllNotes(notes); setSettings(prefs);
    Alert.alert("Conta Google conectada", "Este perfil usa um espaço local separado. Seus cadernos do perfil anterior permanecem preservados no aparelho.");
  }, []);
  const disconnectGoogle = async () => {
    await Promise.all([secureRemove("caderneto.active-owner"), secureRemove("caderneto.google-email"), secureRemove("caderneto.google-subject"), secureRemove("caderneto.google-token")]);
    setAccountEmail(null); setDriveToken(null); setOwnerId("device"); setCurrentNotebookId(null); setTab("shelf");
    const [books, notes, prefs] = await Promise.all([allNotebooks("device"), listNotes("device", { includeArchived: true, includeTrashed: true }), readSettings("device")]);
    setAllBooks(books); setAllNotes(notes); setSettings(prefs);
  };
  const doDriveBackup = async () => {
    if (!driveToken || !accountEmail) { Alert.alert("Conecte sua conta", "Entre com Google antes de enviar um backup."); return; }
    setSyncBusy(true);
    try { await uploadPrivateBackup(driveToken, await buildSnapshot(ownerId, accountEmail)); Alert.alert("Backup concluído", "A cópia foi salva na área privada do Caderneto Digital no Google Drive desta conta."); }
    catch (error) { Alert.alert("Backup não concluído", error instanceof Error ? error.message : "Verifique a conexão e entre novamente no Google."); }
    finally { setSyncBusy(false); }
  };
  const askConfirm = (title: string, message: string, action: () => void) => {
    const invoke = () => { void Promise.resolve().then(action).catch(error => Alert.alert("Não foi possível concluir", error instanceof Error ? error.message : "Tente novamente.")); };
    if (Platform.OS === "web") { if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) invoke(); return; }
    Alert.alert(title, message, [{ text: "Cancelar", style: "cancel" }, { text: "Continuar", style: "destructive", onPress: invoke }]);
  };
  const doDriveRestore = () => askConfirm("Restaurar do Google Drive?", "Os registros com o mesmo identificador serão substituídos pelos dados do backup; confirme que é a cópia desejada.", async () => {
    if (!driveToken || !accountEmail) return;
    setSyncBusy(true);
    try { const snapshot = await downloadPrivateBackup(driveToken); if (!snapshot) { Alert.alert("Nenhum backup encontrado", "Ainda não existe cópia na área privada desta conta do Google Drive."); return; } await restoreSnapshot(snapshot, ownerId); await refresh(); Alert.alert("Restauração concluída", "Os cadernos e notas foram mesclados com o perfil atual."); }
    catch (error) { Alert.alert("Não foi possível restaurar", error instanceof Error ? error.message : "Verifique a conexão e entre novamente no Google."); }
    finally { setSyncBusy(false); }
  });
  const exportLocalBackup = async () => {
    try {
      const snapshot = await buildSnapshot(ownerId, accountEmail ?? "somente neste aparelho");
      const file = new File(Paths.cache, `caderneto-backup-${Date.now()}.json`);
      file.create({ intermediates: true, overwrite: true });
      file.write(JSON.stringify(snapshot));
      const uri = file.uri;
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Guardar cópia do Caderneto Digital" });
      else Alert.alert("Cópia pronta", `Arquivo criado: ${uri}`);
    } catch (error) { Alert.alert("Falha ao exportar", error instanceof Error ? error.message : "Tente novamente."); }
  };
  const importLocalBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain"], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      askConfirm("Importar esta cópia?", "Os itens com IDs iguais aos atuais serão atualizados; outros itens serão adicionados.", async () => {
        const text = await new File(result.assets[0].uri).text();
        const snapshot = JSON.parse(text) as BackupSnapshot;
        if (snapshot.format !== "caderneto-backup" || snapshot.version !== 1) throw new Error("Esse arquivo não é um backup válido do Caderneto Digital.");
        await restoreSnapshot(snapshot, ownerId); await refresh(); Alert.alert("Cópia importada", "Os cadernos e notas foram restaurados no perfil atual.");
      });
    } catch (error) { Alert.alert("Falha ao importar", error instanceof Error ? error.message : "Confira o arquivo escolhido."); }
  };

  const submitForm = async () => {
    if (!form) return;
    if (form.kind === "newNotebook") {
      if (!formValue.trim()) { Alert.alert("Dê um nome ao caderno", "Escreva um título para continuar."); return; }
      const created = await createNotebook(formValue, form.parentId, ownerId, formCover);
      setAllBooks(current => [...current, created]); setForm(null); setFormValue(""); setFormCover(null); return;
    }
    if (form.kind === "renameNotebook") {
      if (!formValue.trim()) return;
      const updated = { ...form.notebook, title: formValue.trim() }; await updateNotebook(updated); setAllBooks(current => current.map(item => item.id === updated.id ? updated : item)); setForm(null); return;
    }
    if (form.kind === "pin") {
      if (!/^\d{4,8}$/.test(formValue)) { Alert.alert("PIN inválido", "Use de 4 a 8 números."); return; }
      await secureSet(`caderneto.pin.${ownerId}`, formValue); await persistSetting({ pinEnabled: true }); setForm(null); setFormValue(""); return;
    }
    if (form.kind === "changePin") {
      const saved = await secureGet(`caderneto.pin.${ownerId}`);
      if (saved !== currentPinValue) { Alert.alert("PIN incorreto", "Digite o PIN atual corretamente."); return; }
      if (!/^\d{4,8}$/.test(formValue)) { Alert.alert("PIN inválido", "O novo PIN deve ter de 4 a 8 números."); return; }
      await secureSet(`caderneto.pin.${ownerId}`, formValue); setForm(null); setFormValue(""); setCurrentPinValue(""); Alert.alert("PIN atualizado", "Seu novo PIN já está ativo."); return;
    }
    if (form.kind === "disablePin") {
      const saved = await secureGet(`caderneto.pin.${ownerId}`);
      if (saved !== formValue) { Alert.alert("PIN incorreto", "Confira o código e tente novamente."); return; }
      await secureRemove(`caderneto.pin.${ownerId}`); await persistSetting({ pinEnabled: false }); setForm(null); setFormValue(""); return;
    }
    const date = new Date(formValue);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) { Alert.alert("Horário inválido", "Escolha uma data e hora futura."); return; }
    const updated = { ...form.note, reminderAt: date.getTime(), updatedAt: Date.now() };
    await writeNote(updated); setAllNotes(current => [updated, ...current.filter(item => item.id !== updated.id)]);
    if (settings.notifications) {
      try { const permission = await Notifications.requestPermissionsAsync(); if (permission.granted) await Notifications.scheduleNotificationAsync({ content: { title: updated.title || "Lembrete do Caderneto", body: "Está na hora de voltar a esta nota." }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } }); }
      catch { Alert.alert("Lembrete salvo", "A nota foi atualizada; este aparelho não confirmou a programação da notificação."); }
    }
    setForm(null);
  };

  const createCurrentNote = () => makeNote(currentNotebookId);
  const handleNotebookMenu = async (action: string) => {
    if (!menuTarget || menuTarget.type !== "notebook") return;
    const book = menuTarget.item;
    setMenuTarget(null);
    if (action === "cover") return chooseBookCover(book);
    if (action === "rename") return openRenameBook(book);
    if (action === "duplicate") { await duplicateNotebookTree(book.id, ownerId); await refresh(); Alert.alert("Caderno duplicado", "A cópia inclui as subpastas e notas deste caderno."); return; }
    if (action === "sort") { setSortVisible(true); return; }
    if (action === "delete") askConfirm("Excluir caderno?", "O caderno e suas subpastas e notas serão removidos deste perfil.", async () => { await deleteNotebookTree(book.id, ownerId); if (currentNotebookId === book.id) setCurrentNotebookId(book.parentId); await refresh(); });
  };
  const toggleNoteFlag = async (note: Note, field: "pinned" | "favorite" | "archived" | "trashed" | "locked") => {
    if (field === "locked" && !settings.pinEnabled && !note.locked) { setMenuTarget(null); showForm({ kind: "pin" }); Alert.alert("Crie um PIN", "Defina um PIN para proteger notas privadas."); return; }
    if (field === "locked" && note.locked && unlockedNoteId !== note.id) { setMenuTarget(null); setPendingLockedNote(note); setPinValue(""); setPinVisible(true); return; }
    const updated = { ...note, [field]: !note[field], updatedAt: Date.now() };
    await writeNote(updated); setAllNotes(current => current.map(item => item.id === note.id ? updated : item)); setMenuTarget(null); if (field === "locked" && !updated.locked) setUnlockedNoteId(null);
  };
  const openNote = (note: Note) => {
    if (note.locked) { setPendingLockedNote(note); setPinValue(""); setPinVisible(true); return; }
    setEditingNote(note);
  };
  const verifyPin = async () => {
    const saved = await secureGet(`caderneto.pin.${ownerId}`);
    if (!saved || pinValue !== saved) { Alert.alert("PIN incorreto", "Tente novamente."); return; }
    setPinVisible(false); setPinValue(""); if (pendingLockedNote) { setUnlockedNoteId(pendingLockedNote.id); setEditingNote(pendingLockedNote); } setPendingLockedNote(null);
  };
  const unlockBiometrics = async () => {
    try { const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Desbloquear Caderneto Digital" }); if (result.success) { setPinVisible(false); if (pendingLockedNote) { setUnlockedNoteId(pendingLockedNote.id); setEditingNote(pendingLockedNote); } setPendingLockedNote(null); } }
    catch { Alert.alert("Biometria indisponível", "Use seu PIN para desbloquear."); }
  };
  const openShare = (note: Note) => { setMenuTarget(null); setShareNote(note); };
  const shareText = async () => { if (!shareNote) return; await Share.share({ title: shareNote.title || "Caderneto Digital", message: `${shareNote.title || "Nota sem título"}\n\n${shareNote.content}` }); setShareNote(null); };
  const sharePdf = async (targetNote: Note | null = shareNote) => {
    if (!targetNote) return;
    try { const file = await Print.printToFileAsync({ html: `<html><body style="font-family:Arial,sans-serif;padding:28px;color:#222"><h1>${htmlEscape(targetNote.title || "Nota sem título")}</h1><p style="white-space:pre-wrap;line-height:1.7">${htmlEscape(targetNote.content)}</p><small>Caderneto Digital · ${new Date(targetNote.updatedAt).toLocaleString("pt-BR")}</small></body></html>` }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Compartilhar nota em PDF" }); else Alert.alert("PDF salvo", file.uri); }
    catch (error) { Alert.alert("Falha ao criar PDF", error instanceof Error ? error.message : "Tente novamente."); }
    setShareNote(null);
  };
  const shareImage = async () => {
    if (!shareNote || !shareCardRef.current) return;
    try { const uri = await captureRef(shareCardRef, { format: "png", quality: 0.95, result: "tmpfile" }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartilhar nota como imagem" }); else Alert.alert("Imagem pronta", uri); }
    catch (error) { Alert.alert("Falha ao criar imagem", error instanceof Error ? error.message : "Tente novamente."); }
    setShareNote(null);
  };
  const pasteClipboard = async () => {
    try { const text = await Clipboard.getStringAsync(); if (!text.trim()) { Alert.alert("Área de transferência vazia", "Copie um texto antes de colar."); return; } const note = { ...emptyNote(ownerId, currentNotebookId), title: text.trim().split("\n")[0].slice(0, 60), content: text }; await writeNote(note); setAllNotes(current => [note, ...current]); setEditingNote(note); }
    catch { Alert.alert("Não foi possível acessar", "Use a opção de colar do teclado."); }
  };
  const exportPdfFromMenu = async (note: Note) => { setMenuTarget(null); await sharePdf(note); };
  const updateNoteMenu = async (field: "pinned" | "favorite" | "archived" | "trashed" | "locked") => { if (menuTarget?.type === "note") await toggleNoteFlag(menuTarget.item, field); };
  const enableNotifications = async (value: boolean) => {
    if (value) { try { const permission = await Notifications.requestPermissionsAsync(); if (!permission.granted) { Alert.alert("Notificações desativadas", "Autorize as notificações nas configurações do aparelho para receber lembretes."); return; } } catch { Alert.alert("Permissão não confirmada", "Não foi possível habilitar notificações neste ambiente."); return; } }
    await persistSetting({ notifications: value });
  };
  const handleLockToggle = (value: boolean) => { if (value) showForm({ kind: "pin" }); else showForm({ kind: "disablePin" }); };
  const handleBiometric = async () => {
    if (!settings.pinEnabled) { Alert.alert("Ative a fechadura primeiro", "Crie um PIN antes de habilitar a biometria."); return; }
    if (settings.biometricEnabled) { await persistSetting({ biometricEnabled: false }); return; }
    try { const hasHardware = await LocalAuthentication.hasHardwareAsync(); const enrolled = await LocalAuthentication.isEnrolledAsync(); if (!hasHardware || !enrolled) { Alert.alert("Biometria não configurada", "Cadastre uma impressão digital ou reconhecimento facial nas configurações do Android."); return; } const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirmar biometria" }); if (result.success) { await persistSetting({ biometricEnabled: true }); Alert.alert("Biometria disponível", "Você poderá usar a biometria na tela de desbloqueio."); } }
    catch { Alert.alert("Biometria indisponível", "Use o PIN do aplicativo neste aparelho."); }
  };
  const cycleLanguage = () => persistSetting({ language: settings.language === "pt-BR" ? "en" : settings.language === "en" ? "es" : "pt-BR" });
  const cycleDate = () => persistSetting({ dateFormat: settings.dateFormat === "dd/MM/yyyy" ? "MM/dd/yyyy" : settings.dateFormat === "MM/dd/yyyy" ? "yyyy-MM-dd" : "dd/MM/yyyy" });
  const handleDragSave = async (items: Notebook[]) => { setAllBooks(current => current.map(item => { const index = items.findIndex(book => book.id === item.id); return index < 0 ? item : { ...item, sortOrder: index }; })); await reorderNotebooks(ownerId, currentNotebookId, items.map(item => item.id)); };
  const changeTab = (next: Tab) => { setTab(next); setSearch(""); };
  const backToParent = () => setCurrentNotebookId(current => currentNotebook?.parentId ?? null);
  const moveNoteToNotebook = async (notebookId: string | null) => {
    if (!moveNote) return;
    const updated = { ...moveNote, notebookId, updatedAt: Date.now() };
    await writeNote(updated); setAllNotes(current => current.map(item => item.id === updated.id ? updated : item)); setMoveNote(null);
  };

  if (busy) return <View style={styles.loading}><ActivityIndicator size="large" color="#D9829F" /><Text style={styles.loadingText}>Abrindo seu caderneto…</Text></View>;
  if (introVisible) return <IntroScreen onFinish={finishIntro} soundEnabled={settings.soundEnabled} />;
  const navLabels = settings.language === "en" ? { notes: "Notes", shelf: "Shelf", calendar: "Calendar", mine: "Me" } : settings.language === "es" ? { notes: "Notas", shelf: "Estante", calendar: "Calendario", mine: "Yo" } : { notes: "Notas", shelf: "Estante", calendar: "Calendário", mine: "Meu" };
  const headerTitle = tab === "shelf" ? currentNotebook?.title ?? "Caderneto Digital" : tab === "notes" ? navLabels.notes : tab === "calendar" ? navLabels.calendar : navLabels.mine;
  const appTitle = tab === "shelf" && !currentNotebookId ? "Minha estante" : headerTitle;
  const childrenLabel = currentNotebook ? "Subpastas deste caderno" : "Seus cadernos";
  const noteMenu = menuTarget?.type === "note" ? menuTarget.item : null;
  const bookMenu = menuTarget?.type === "notebook" ? menuTarget.item : null;

  return <SafeAreaView edges={["top", "bottom"]} style={[styles.root, { backgroundColor: c.background }]}>
    <StatusBar style={dark ? "light" : "dark"} />
    <View style={[styles.header, { borderBottomColor: c.line }]}>
      {tab === "shelf" && currentNotebookId ? <Pressable onPress={backToParent} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable> : <View style={styles.brandMark}><Ionicons name="book-outline" size={22} color={c.pinkDark} /></View>}
      <View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.headerTitle, { color: c.text }]}>{appTitle}</Text><Text style={[styles.headerSubtitle, { color: c.muted }]}>{tab === "shelf" ? `${children.length} ${currentNotebook ? "subpastas" : "cadernos"} · ${activeNotes.length} notas` : "Suas ideias, do seu jeito"}</Text></View>
      {tab === "shelf" && <Pressable onPress={() => setMenuTarget({ type: "notebook", item: currentNotebook ?? { id: "", ownerId, parentId: null, title: "Estante", coverUri: null, sortOrder: 0, createdAt: Date.now() } })} style={styles.moreButton}><Ionicons name="ellipsis-vertical" size={21} color={c.text} /></Pressable>}
      {tab === "notes" && <Pressable onPress={pasteClipboard} style={styles.moreButton}><Ionicons name="clipboard-outline" size={21} color={c.text} /></Pressable>}
    </View>

    <View style={styles.body}>
      {tab === "shelf" && <>
        <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: c.text }]}>{childrenLabel}</Text><Pressable onPress={() => setSortVisible(true)} style={styles.sortButton}><Ionicons name="swap-vertical" size={16} color={c.pinkDark} /><Text style={[styles.sortText, { color: c.pinkDark }]}>Ordenar</Text></Pressable></View>
        <NotebookShelf notebooks={children} noteCounts={counts} createLabel={currentNotebook ? "Criar subpasta" : "Criar caderno"} dark={dark} onCreate={() => openCreateBook(currentNotebookId)} onOpen={book => setCurrentNotebookId(book.id)} onLongPress={book => setMenuTarget({ type: "notebook", item: book })} />
        {currentNotebook && <View style={styles.folderNotes}><View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: c.text }]}>Notas deste caderno</Text><Pressable onPress={createCurrentNote} style={styles.smallAdd}><Ionicons name="add" size={18} color={c.pinkDark} /><Text style={[styles.sortText, { color: c.pinkDark }]}>Nota</Text></Pressable></View>
          {currentNotes.map(note => <NoteRow key={note.id} note={note} dark={dark} dateFormat={settings.dateFormat} timezone={settings.timezone} onOpen={() => openNote(note)} onLongPress={() => setMenuTarget({ type: "note", item: note })} />)}
          {currentNotes.length === 0 && <Text style={[styles.emptyFolder, { color: c.muted }]}>Este caderno ainda está vazio. Crie uma nota ou subpasta.</Text>}
        </View>}
      </>}
      {tab === "notes" && <NoteList notes={visibleNotes} notebooks={allBooks} query={search} onQuery={setSearch} onOpen={openNote} onLongPress={note => setMenuTarget({ type: "note", item: note })} clipboardEnabled={settings.clipboardEnabled} onPaste={pasteClipboard} dark={dark} dateFormat={settings.dateFormat} timezone={settings.timezone} />}
      {tab === "calendar" && <CalendarPanel notes={activeNotes} timezone={settings.timezone} onChangeTimezone={timezone => persistSetting({ timezone })} onOpenNote={openNote} weekStartsOn={settings.weekStartsOn} dateFormat={settings.dateFormat} dark={dark} />}
      {tab === "mine" && <SettingsPanel settings={settings} noteCount={awaitCount(allNotes)} email={accountEmail} busy={syncBusy} dark={dark} onConnect={handleGoogleConnected} onBackup={doDriveBackup} onRestore={doDriveRestore} onDisconnect={disconnectGoogle} onTheme={value => persistSetting({ theme: value ? "dark" : "light" })} onNotifications={enableNotifications} onClipboard={value => persistSetting({ clipboardEnabled: value })} onSound={value => persistSetting({ soundEnabled: value })} onLock={handleLockToggle} onBiometric={handleBiometric} onChangePin={() => showForm({ kind: "changePin" })} onLanguage={cycleLanguage} onDateFormat={cycleDate} onWeekStart={() => persistSetting({ weekStartsOn: settings.weekStartsOn === 0 ? 1 : 0 })} onCalendar={() => changeTab("calendar")} onExportLocal={exportLocalBackup} onImportLocal={importLocalBackup} onAbout={() => Alert.alert("Caderneto Digital", "Suas notas ficam no seu perfil local até você escolher conectar uma conta Google.")} />}
    </View>

    <View style={[styles.bottomNav, { backgroundColor: c.nav, borderTopColor: c.line }]}>
      <NavButton icon="document-text-outline" label={navLabels.notes} active={tab === "notes"} color={c} onPress={() => changeTab("notes")} />
      <NavButton icon="book-outline" label={navLabels.shelf} active={tab === "shelf"} color={c} onPress={() => changeTab("shelf")} />
      <Pressable accessibilityLabel="Criar caderno ou nota" onPress={() => setPlusVisible(true)} style={[styles.plusButton, { backgroundColor: c.text }]}><Ionicons name="add" size={31} color={c.background} /></Pressable>
      <NavButton icon="calendar-outline" label={navLabels.calendar} active={tab === "calendar"} color={c} onPress={() => changeTab("calendar")} />
      <NavButton icon="person-circle-outline" label={navLabels.mine} active={tab === "mine"} color={c} onPress={() => changeTab("mine")} />
    </View>

    {editingNote && <NoteEditor key={editingNote.id} note={editingNote} notebookLabel={allBooks.find(book => book.id === editingNote.notebookId)?.title ?? "Sem caderno"} dark={dark} dateFormat={settings.dateFormat} onClose={() => setEditingNote(null)} onSave={saveEditedNote} onMenu={note => setMenuTarget({ type: "note", item: note })} onShare={openShare} onMoveNotebook={note => { void saveEditedNote(note); setEditingNote(null); setMoveNote(note); }} onAddImage={addImageToNote} onAddAudio={addAudioToNote} onDraw={openDrawing} onReminder={note => { void saveEditedNote(note); setEditingNote(null); showForm({ kind: "reminder", note }); }} />}
    <DrawingPad visible={drawingVisible} onClose={() => finishDrawing(null)} onSave={svg => finishDrawing(svg)} />
    <NotebookSortModal visible={sortVisible} notebooks={children} onClose={() => setSortVisible(false)} onSave={handleDragSave} />

    <Modal transparent animationType="fade" visible={plusVisible} onRequestClose={() => setPlusVisible(false)}>
      <Pressable style={styles.scrim} onPress={() => setPlusVisible(false)}><View style={styles.sheet}>
        <Text style={styles.sheetTitle}>O que vamos criar?</Text>
        <SheetAction icon="book-outline" title={currentNotebook ? "Nova subpasta" : "Novo caderno"} onPress={() => openCreateBook(currentNotebookId)} />
        <SheetAction icon="document-text-outline" title="Nova nota" onPress={() => makeNote(currentNotebookId)} />
        <Pressable onPress={() => setPlusVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
      </View></Pressable>
    </Modal>

    <Modal transparent animationType="fade" visible={!!moveNote} onRequestClose={() => setMoveNote(null)}>
      <View style={styles.scrim}><View style={styles.formCard}><Text style={styles.formTitle}>Mover nota para</Text>
        <ScrollView style={{ maxHeight: 380 }}><SheetAction icon="folder-open-outline" title="Sem caderno" onPress={() => moveNoteToNotebook(null)} />{allBooks.map(book => <SheetAction key={book.id} icon="book-outline" title={folderPath(allBooks, book)} onPress={() => moveNoteToNotebook(book.id)} />)}</ScrollView>
        <Pressable onPress={() => setMoveNote(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
      </View></View>
    </Modal>

    <Modal transparent animationType="fade" visible={!!form} onRequestClose={() => setForm(null)}>
      <View style={styles.scrim}><View style={styles.formCard}>
        <Text style={styles.formTitle}>{form?.kind === "newNotebook" ? (form.parentId ? "Criar subpasta" : "Criar caderno") : form?.kind === "renameNotebook" ? "Renomear caderno" : form?.kind === "pin" ? "Criar PIN" : form?.kind === "changePin" ? "Trocar PIN" : form?.kind === "disablePin" ? "Digite seu PIN" : "Definir lembrete"}</Text>
        {form?.kind === "newNotebook" && <>
          <TextInput value={formValue} onChangeText={setFormValue} placeholder="Nome do caderno" style={styles.formInput} autoFocus />
          <Pressable onPress={async () => setFormCover(await pickPhoto())} style={styles.coverPicker}>{formCover ? <Image source={{ uri: formCover }} style={styles.coverPreview} /> : <Ionicons name="image-outline" size={20} color="#91526A" />}<Text style={styles.coverPickerText}>{formCover ? "Capa escolhida" : "Escolher capa da galeria (opcional)"}</Text></Pressable>
        </>}
        {form?.kind === "renameNotebook" && <TextInput value={formValue} onChangeText={setFormValue} placeholder="Novo nome" style={styles.formInput} autoFocus />}
        {(form?.kind === "pin" || form?.kind === "disablePin" || form?.kind === "changePin") && <><Text style={styles.formHint}>Use de 4 a 8 números. O código fica protegido no armazenamento seguro do aparelho.</Text>{form?.kind === "changePin" && <TextInput value={currentPinValue} onChangeText={setCurrentPinValue} keyboardType="number-pad" secureTextEntry maxLength={8} placeholder="PIN atual" style={styles.formInput} autoFocus />}<TextInput value={formValue} onChangeText={setFormValue} keyboardType="number-pad" secureTextEntry maxLength={8} placeholder={form?.kind === "changePin" ? "Novo PIN" : "PIN"} style={styles.formInput} autoFocus={form?.kind !== "changePin"} /></>}
        {form?.kind === "reminder" && <><Text style={styles.formHint}>Escolha data e hora no formato exibido pelo aparelho.</Text><TextInput value={formValue} onChangeText={setFormValue} placeholder="AAAA-MM-DDTHH:mm" style={styles.formInput} /></>}
        <View style={styles.formButtons}><Pressable onPress={() => setForm(null)} style={styles.formCancel}><Text style={styles.formCancelText}>Cancelar</Text></Pressable><Pressable onPress={submitForm} style={styles.formSubmit}><Text style={styles.formSubmitText}>{form?.kind === "reminder" ? "Salvar lembrete" : form?.kind === "changePin" ? "Alterar PIN" : "Salvar"}</Text></Pressable></View>
      </View></View>
    </Modal>

    <Modal transparent animationType="fade" visible={!!menuTarget} onRequestClose={() => setMenuTarget(null)}>
      <Pressable style={styles.scrim} onPress={() => setMenuTarget(null)}><View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{bookMenu ? bookMenu.title : noteMenu?.locked && unlockedNoteId !== noteMenu.id ? "Nota protegida" : noteMenu?.title || "Opções da nota"}</Text>
        {bookMenu && <>
          <SheetAction icon="image-outline" title="Alterar capa" onPress={() => handleNotebookMenu("cover")} />
          {currentNotebookId === bookMenu.id || bookMenu.id === "" ? <SheetAction icon="add-circle-outline" title="Criar caderno ou subpasta" onPress={() => openCreateBook(currentNotebookId)} /> : null}
          <SheetAction icon="create-outline" title="Alterar nome" onPress={() => handleNotebookMenu("rename")} />
          <SheetAction icon="copy-outline" title="Duplicar caderno e conteúdo" onPress={() => handleNotebookMenu("duplicate")} />
          <SheetAction icon="swap-vertical-outline" title="Ordenar por arraste" onPress={() => handleNotebookMenu("sort")} />
          {bookMenu.id !== "" && <SheetAction icon="trash-outline" title="Excluir caderno" danger onPress={() => handleNotebookMenu("delete")} />}
        </>}
        {noteMenu?.locked && unlockedNoteId !== noteMenu.id && <SheetAction icon="lock-closed-outline" title="Abrir nota com PIN" onPress={() => { setMenuTarget(null); setPendingLockedNote(noteMenu); setPinValue(""); setPinVisible(true); }} />}
        {noteMenu && (!noteMenu.locked || unlockedNoteId === noteMenu.id) && <>
          <SheetAction icon={noteMenu.pinned ? "pin" : "pin-outline"} title={noteMenu.pinned ? "Desafixar" : "Fixar no topo"} onPress={() => updateNoteMenu("pinned")} />
          <SheetAction icon={noteMenu.favorite ? "star" : "star-outline"} title={noteMenu.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onPress={() => updateNoteMenu("favorite")} />
          <SheetAction icon="alarm-outline" title="Adicionar lembrete" onPress={() => { setMenuTarget(null); showForm({ kind: "reminder", note: noteMenu }); }} />
          <SheetAction icon={noteMenu.locked ? "lock-open-outline" : "lock-closed-outline"} title={noteMenu.locked ? "Desbloquear nota" : "Fechadura da nota"} onPress={() => noteMenu.locked ? toggleNoteFlag(noteMenu, "locked") : toggleNoteFlag(noteMenu, "locked")} />
          <SheetAction icon="share-outline" title="Compartilhar como texto, imagem ou PDF" onPress={() => openShare(noteMenu)} />
          <SheetAction icon="document-attach-outline" title="Exportar para PDF" onPress={() => exportPdfFromMenu(noteMenu)} />
          <SheetAction icon="archive-outline" title={noteMenu.archived ? "Desarquivar" : "Arquivar"} onPress={() => updateNoteMenu("archived")} />
          <SheetAction icon="phone-portrait-outline" title="Atalho na tela inicial" onPress={() => { setMenuTarget(null); Alert.alert("Atalho Android", "O atalho fixo precisa de uma etapa de build nativo; esta prévia não cria widgets na tela inicial."); }} />
          <SheetAction icon="trash-outline" title={noteMenu.trashed ? "Restaurar da lixeira" : "Mover para a lixeira"} danger={!noteMenu.trashed} onPress={() => updateNoteMenu("trashed")} />
        </>}
      </View></Pressable>
    </Modal>

    <Modal transparent animationType="fade" visible={!!shareNote} onRequestClose={() => setShareNote(null)}>
      <Pressable style={styles.scrim} onPress={() => setShareNote(null)}><View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Compartilhar nota</Text>
        <SheetAction icon="text-outline" title="Somente texto" onPress={shareText} />
        <SheetAction icon="image-outline" title="Compartilhar como imagem" onPress={shareImage} />
        <SheetAction icon="document-text-outline" title="Compartilhar como PDF" onPress={sharePdf} />
      </View></Pressable>
    </Modal>

    {shareNote && <View ref={shareCardRef} collapsable={false} pointerEvents="none" style={styles.offscreenShare}><Text style={styles.shareTitle}>{shareNote.title || "Nota sem título"}</Text><Text style={styles.shareContent}>{shareNote.content || " "}</Text><Text style={styles.shareFooter}>Caderneto Digital · {new Date(shareNote.updatedAt).toLocaleString("pt-BR")}</Text></View>}

    <Modal transparent animationType="fade" visible={pinVisible} onRequestClose={() => { if (!settings.pinEnabled) setPinVisible(false); }}>
      <View style={styles.lockScrim}><View style={styles.lockCard}><View style={styles.lockIcon}><Ionicons name="lock-closed" size={27} color="#9B4E69" /></View><Text style={styles.lockTitle}>{pendingLockedNote ? "Nota protegida" : "Seu caderneto está trancado"}</Text><Text style={styles.lockHint}>Digite seu PIN para continuar.</Text><TextInput value={pinValue} onChangeText={setPinValue} secureTextEntry keyboardType="number-pad" placeholder="PIN" style={styles.formInput} autoFocus maxLength={8} /><Pressable onPress={verifyPin} style={styles.formSubmit}><Text style={styles.formSubmitText}>Desbloquear</Text></Pressable>{settings.biometricEnabled && <Pressable onPress={unlockBiometrics} style={styles.bioButton}><Text style={styles.bioText}>Usar biometria</Text></Pressable>}</View></View>
    </Modal>

  </SafeAreaView>;
}

function awaitCount(notes: Note[]) { return notes.filter(note => !note.trashed).length; }
function folderPath(notebooks: Notebook[], book: Notebook) {
  const parts = [book.title]; const seen = new Set([book.id]); let parentId = book.parentId;
  while (parentId && !seen.has(parentId)) { seen.add(parentId); const parent = notebooks.find(item => item.id === parentId); if (!parent) break; parts.push(parent.title); parentId = parent.parentId; }
  return parts.reverse().join(" › ");
}
function NoteRow({ note, dark, dateFormat, timezone, onOpen, onLongPress }: { note: Note; dark: boolean; dateFormat: DateFormat; timezone: string; onOpen: () => void; onLongPress: () => void }) {
  const text = dark ? "#F8F3F5" : "#211E21"; const muted = dark ? "#B7AFB4" : "#817980";
  return <Pressable onPress={onOpen} onLongPress={onLongPress} delayLongPress={400} style={[styles.noteRow, { borderBottomColor: dark ? "#3C353A" : "#EFE8EB" }]}><View style={[styles.noteBadge, { backgroundColor: note.color === "#FFFFFF" ? "#F8E7ED" : note.color }]}><Ionicons name={note.locked ? "lock-closed" : note.favorite ? "star" : "document-text-outline"} size={19} color="#8C4961" /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.noteRowTitle, { color: text }]}>{note.locked ? "Nota protegida" : note.title || "Nota sem título"}</Text><Text numberOfLines={1} style={[styles.noteRowText, { color: muted }]}>{note.locked ? "Toque e informe o PIN" : note.content || "Toque para escrever"}</Text></View><Text style={[styles.noteRowDate, { color: muted }]}>{formatDate(note.updatedAt, dateFormat, timezone)}</Text></Pressable>;
}
function NavButton({ icon, label, active, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; color: typeof palette.light; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.navItem}><Ionicons name={icon} size={23} color={active ? color.pinkDark : color.muted} /><Text style={[styles.navLabel, { color: active ? color.pinkDark : color.muted, fontWeight: active ? "700" : "500" }]}>{label}</Text></Pressable>;
}
function SheetAction({ icon, title, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={styles.sheetAction}><Ionicons name={icon} size={20} color={danger ? "#B33F53" : "#705366"} /><Text style={[styles.sheetActionText, danger && { color: "#B33F53" }]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", gap: 12 }, loadingText: { color: "#6F6670", fontSize: 15, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  header: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, brandMark: { width: 41, height: 41, borderRadius: 14, backgroundColor: "#F9E7ED", alignItems: "center", justifyContent: "center" }, backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 21, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, headerSubtitle: { fontSize: 12, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 2 }, moreButton: { width: 38, height: 40, alignItems: "center", justifyContent: "center" }, body: { flex: 1 },
  sectionHeading: { minHeight: 49, paddingHorizontal: 19, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { fontSize: 18, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" }, sortButton: { flexDirection: "row", alignItems: "center", gap: 3, padding: 8 }, sortText: { fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" }, smallAdd: { flexDirection: "row", alignItems: "center", gap: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#FFF4F7", borderRadius: 12 }, folderNotes: { paddingBottom: 15 }, emptyFolder: { marginHorizontal: 20, marginBottom: 15, lineHeight: 21, fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  noteRow: { minHeight: 68, marginHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 }, noteBadge: { width: 42, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }, noteRowTitle: { fontSize: 15, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" }, noteRowText: { fontSize: 12, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 2 }, noteRowDate: { fontSize: 11, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  bottomNav: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, paddingTop: 4 }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 52 }, navLabel: { fontSize: 10, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, plusButton: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginHorizontal: 3, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 4 },
  scrim: { flex: 1, backgroundColor: "rgba(25,20,24,0.32)", justifyContent: "flex-end" }, sheet: { backgroundColor: "#FFFFFF", paddingTop: 12, paddingHorizontal: 18, paddingBottom: Platform.OS === "ios" ? 32 : 20, borderTopLeftRadius: 25, borderTopRightRadius: 25 }, sheetTitle: { color: "#282329", fontSize: 20, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", marginHorizontal: 3, marginBottom: 11 }, sheetAction: { minHeight: 51, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0E9EC" }, sheetActionText: { fontSize: 14, color: "#332D32", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, cancel: { alignSelf: "center", paddingHorizontal: 20, paddingVertical: 12 }, cancelText: { color: "#8B4862", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" },
  formCard: { marginHorizontal: 22, marginBottom: "auto", marginTop: "auto", backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 15, elevation: 5 }, formTitle: { color: "#231F22", fontSize: 20, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", marginBottom: 13 }, formHint: { color: "#766D73", fontSize: 13, lineHeight: 19, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginBottom: 9 }, formInput: { minHeight: 49, borderWidth: 1, borderColor: "#E8DEE3", backgroundColor: "#FFFCFD", borderRadius: 13, paddingHorizontal: 13, fontSize: 16, color: "#211E21", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginBottom: 10 }, formButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 8 }, formCancel: { paddingHorizontal: 16, paddingVertical: 12 }, formCancelText: { color: "#766D73", fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, formSubmit: { backgroundColor: "#F2AFC3", borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12, alignItems: "center", justifyContent: "center" }, formSubmitText: { color: "#33282D", fontSize: 14, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, coverPicker: { minHeight: 45, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FBF3F6", paddingHorizontal: 10 }, coverPreview: { width: 34, height: 34, borderRadius: 8 }, coverPickerText: { color: "#70495A", fontSize: 12, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), flex: 1 },
  lockScrim: { flex: 1, backgroundColor: "#FFF9FB", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }, lockCard: { width: "100%", maxWidth: 380, alignItems: "center" }, lockIcon: { width: 64, height: 64, borderRadius: 23, backgroundColor: "#F7E4EA", alignItems: "center", justifyContent: "center", marginBottom: 17 }, lockTitle: { color: "#201D20", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", fontSize: 22, textAlign: "center" }, lockHint: { color: "#7D747A", fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 7, marginBottom: 18 }, bioButton: { padding: 14 }, bioText: { color: "#92506A", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" },
  offscreenShare: { position: "absolute", left: -2000, top: 0, width: 900, minHeight: 480, backgroundColor: "#FFFFFF", paddingHorizontal: 65, paddingVertical: 55 }, shareTitle: { color: "#171519", fontSize: 42, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginBottom: 28 }, shareContent: { color: "#2D292D", fontSize: 27, lineHeight: 42, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, shareFooter: { color: "#8A7F86", fontSize: 17, marginTop: 40, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
});
