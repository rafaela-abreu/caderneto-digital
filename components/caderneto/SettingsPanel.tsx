import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppSettings } from "../../lib/caderneto/types";
import { GoogleAccountPanel, type GoogleIdentity } from "./GoogleAccountPanel";

type Props = {
  settings: AppSettings; noteCount: number; email: string | null; busy: boolean; dark: boolean;
  onConnect: (identity: GoogleIdentity) => void; onBackup: () => void; onRestore: () => void; onDisconnect: () => void;
  onTheme: (value: boolean) => void; onNotifications: (value: boolean) => void; onClipboard: (value: boolean) => void; onSound: (value: boolean) => void; onLock: (value: boolean) => void;
  onBiometric: () => void; onChangePin: () => void; onLanguage: () => void; onDateFormat: () => void; onWeekStart: () => void; onCalendar: () => void; onExportLocal: () => void; onImportLocal: () => void; onAbout: () => void;
};
export function SettingsPanel(props: Props) {
  const { settings } = props;
  const c = props.dark ? { background: "#191719", card: "#272328", line: "#3D363B", text: "#F7F2F4", muted: "#B9AFB5", icon: "#3A3037" } : { background: "#FFFFFF", card: "#FFF8FA", line: "#F1E6EA", text: "#211E21", muted: "#81777E", icon: "#F8E6EC" };
  return <ScrollView contentContainerStyle={[styles.root, { backgroundColor: c.background }]} showsVerticalScrollIndicator={false}>
    <Text style={[styles.heading, { color: c.text }]}>Meu</Text>
    <View style={[styles.stats, { backgroundColor: c.card, borderColor: c.line }]}><View style={[styles.statIcon, { backgroundColor: c.icon }]}><Ionicons name="document-text-outline" size={23} color="#8B4660" /></View><View><Text style={[styles.statNumber, { color: c.text }]}>{props.noteCount}</Text><Text style={[styles.statLabel, { color: c.muted }]}>notas no seu caderneto</Text></View></View>
    <GoogleAccountPanel email={props.email} busy={props.busy} dark={props.dark} onConnected={props.onConnect} onBackup={props.onBackup} onRestore={props.onRestore} onDisconnect={props.onDisconnect} />
    <Text style={[styles.section, { color: props.dark ? "#F0A7BE" : "#9A526B" }]}>Aparência e uso</Text>
    <SettingToggle dark={props.dark} title="Modo escuro" detail="O padrão do app é branco e claro." icon="moon-outline" value={settings.theme === "dark"} onChange={props.onTheme} />
    <SettingToggle dark={props.dark} title="Som da introdução" detail="Tocar o som de carregamento na abertura." icon="volume-high-outline" value={settings.soundEnabled} onChange={props.onSound} />
    <SettingToggle dark={props.dark} title="Notificações" detail="Lembretes para notas e tarefas." icon="notifications-outline" value={settings.notifications} onChange={props.onNotifications} />
    <SettingToggle dark={props.dark} title="Fechadura do aplicativo" detail="Pedir PIN ao abrir o Caderneto Digital." icon="lock-closed-outline" value={settings.pinEnabled} onChange={props.onLock} />
    <SettingRow dark={props.dark} title="Biometria" detail={settings.biometricEnabled ? "Ativada para desbloqueio." : "Usar impressão digital/rosto se disponível."} icon="finger-print-outline" onPress={props.onBiometric} />
    {settings.pinEnabled && <SettingRow dark={props.dark} title="Trocar PIN" detail="Definir um novo código de 4 a 8 números." icon="key-outline" onPress={props.onChangePin} />}
    <Text style={[styles.section, { color: props.dark ? "#F0A7BE" : "#9A526B" }]}>Preferências</Text>
    <SettingRow dark={props.dark} title="Idioma" detail={settings.language === "pt-BR" ? "Português (Brasil)" : settings.language === "en" ? "English" : "Español"} icon="language-outline" onPress={props.onLanguage} />
    <SettingRow dark={props.dark} title="Formato de data" detail={settings.dateFormat} icon="calendar-outline" onPress={props.onDateFormat} />
    <SettingRow dark={props.dark} title="Início da semana" detail={settings.weekStartsOn === 0 ? "Domingo" : "Segunda-feira"} icon="today-outline" onPress={props.onWeekStart} />
    <SettingRow dark={props.dark} title="Calendário e fusos" detail={`Principal: ${settings.timezone.replaceAll("_", " ")}`} icon="globe-outline" onPress={props.onCalendar} />
    <SettingToggle dark={props.dark} title="Área de transferência" detail="Mostrar botão para colar texto copiado." icon="clipboard-outline" value={settings.clipboardEnabled} onChange={props.onClipboard} />
    <Text style={[styles.section, { color: props.dark ? "#F0A7BE" : "#9A526B" }]}>Cópias e privacidade</Text>
    <SettingRow dark={props.dark} title="Exportar cópia local" detail="Criar arquivo de backup para guardar no aparelho ou Drive." icon="download-outline" onPress={props.onExportLocal} />
    <SettingRow dark={props.dark} title="Importar cópia local" detail="Mesclar um arquivo de backup salvo." icon="cloud-upload-outline" onPress={props.onImportLocal} />
    <SettingRow dark={props.dark} title="Sobre o app" detail="Caderneto Digital · uso pessoal" icon="book-outline" onPress={props.onAbout} />
    <Text style={[styles.privacy, { color: c.muted }]}>Suas notas locais ficam no aparelho. O backup em nuvem só fica ativo depois que você conectar uma conta Google e concluir a autorização.</Text>
    <View style={{ height: 28 }} />
  </ScrollView>;
}
function SettingToggle({ title, detail, icon, value, onChange, dark }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; value: boolean; onChange: (value: boolean) => void; dark: boolean }) {
  const c = dark ? { line: "#3D363B", title: "#F7F2F4", muted: "#B9AFB5", icon: "#3A3037" } : { line: "#F0EAED", title: "#29252A", muted: "#847B82", icon: "#F8F2F4" };
  return <View style={[styles.row, { borderBottomColor: c.line }]}><View style={[styles.icon, { backgroundColor: c.icon }]}><Ionicons name={icon} size={20} color="#A76C84" /></View><View style={styles.copy}><Text style={[styles.title, { color: c.title }]}>{title}</Text><Text style={[styles.detail, { color: c.muted }]}>{detail}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: "#DED8DB", true: "#E8A4B8" }} thumbColor={value ? "#A64C6B" : "#FFFFFF"} />
  </View>;
}
function SettingRow({ title, detail, icon, onPress, dark }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; dark: boolean }) {
  const c = dark ? { line: "#3D363B", title: "#F7F2F4", muted: "#B9AFB5", icon: "#3A3037" } : { line: "#F0EAED", title: "#29252A", muted: "#847B82", icon: "#F8F2F4" };
  return <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.line }]}><View style={[styles.icon, { backgroundColor: c.icon }]}><Ionicons name={icon} size={20} color="#A76C84" /></View><View style={styles.copy}><Text style={[styles.title, { color: c.title }]}>{title}</Text><Text style={[styles.detail, { color: c.muted }]}>{detail}</Text></View><Ionicons name="chevron-forward" size={18} color={c.muted} /></Pressable>;
}
const styles = StyleSheet.create({ root: { paddingTop: 16, paddingBottom: 30 }, heading: { fontSize: 29, color: "#181619", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", paddingHorizontal: 18, marginBottom: 12 }, stats: { marginHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "#FFF8FA", borderColor: "#F1E6EA", borderWidth: 1, borderRadius: 18, padding: 14 }, statIcon: { width: 47, height: 47, backgroundColor: "#F8E6EC", borderRadius: 15, alignItems: "center", justifyContent: "center" }, statNumber: { fontSize: 22, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), color: "#211E21" }, statLabel: { color: "#81777E", fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, section: { fontSize: 14, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", color: "#9A526B", marginHorizontal: 20, marginTop: 24, marginBottom: 4 }, row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0EAED" }, icon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#F8F2F4", alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { color: "#29252A", fontSize: 14, fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) }, detail: { color: "#847B82", fontSize: 11, lineHeight: 16, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 2 }, privacy: { marginHorizontal: 20, marginTop: 17, color: "#847B82", fontSize: 12, lineHeight: 18, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) } });
