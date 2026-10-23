import { useEffect } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

export type GoogleIdentity = { email: string; subject: string; accessToken: string; name?: string };
type Props = { email: string | null; onConnected: (identity: GoogleIdentity) => void; onBackup: () => void; onRestore: () => void; onDisconnect: () => void; busy?: boolean; dark?: boolean };

export function GoogleAccountPanel({ email, onConnected, onBackup, onRestore, onDisconnect, busy = false, dark = false }: Props) {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const androidClientId = extra.googleAndroidClientId ?? "";
  const webClientId = extra.googleWebClientId ?? "";
  const configured = Platform.OS === "web" ? !!webClientId : !!androidClientId;
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: androidClientId || undefined,
    webClientId: webClientId || undefined,
    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const token = response.authentication?.accessToken;
    if (!token) { Alert.alert("Não foi possível entrar", "O Google não retornou um token de acesso."); return; }
    let cancelled = false;
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } })
      .then(async result => { if (!result.ok) throw new Error("Não foi possível consultar a conta Google."); return result.json(); })
      .then(profile => { if (!cancelled) onConnected({ email: profile.email, subject: profile.sub, accessToken: token, name: profile.name }); })
      .catch(error => Alert.alert("Falha ao entrar com Google", error instanceof Error ? error.message : "Tente novamente."));
    return () => { cancelled = true; };
  }, [response, onConnected]);

  const connect = async () => {
    if (!configured) {
      Alert.alert("Configuração do Google pendente", "Para ativar Gmail e backup privado no Drive, este projeto precisa de um OAuth Client ID do Google para Android e da permissão de arquivos privados do app. Não informe sua senha do Gmail aqui.");
      return;
    }
    await promptAsync();
  };

  const colors = dark ? { card: "#272328", line: "#443B42", text: "#F7F2F4", muted: "#B9AFB5", badge: "#302B30" } : { card: "#FFFAFB", line: "#F1E6EA", text: "#221F22", muted: "#726A70", badge: "#FFFFFF" };
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <View style={styles.headingRow}><View style={[styles.googleBadge, { backgroundColor: colors.badge, borderColor: colors.line }]}><Ionicons name="logo-google" size={21} color="#4285F4" /></View><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>Sua conta e seu backup</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Privado na conta Google conectada</Text></View></View>
      {email ? <>
        <View style={styles.account}><Ionicons name="checkmark-circle" size={19} color="#43895A" /><Text style={[styles.email, { color: colors.text }]}>{email}</Text></View>
        <Text style={[styles.privacy, { color: colors.muted }]}>As notas ficam separadas pelo identificador desta conta. O backup usa a área de dados privada do Caderneto Digital no Google Drive.</Text>
        <Pressable disabled={busy} onPress={onBackup} style={styles.primary}><Ionicons name="cloud-upload-outline" size={19} color="#2B2227" /><Text style={styles.primaryText}>{busy ? "Sincronizando…" : "Fazer backup agora"}</Text></Pressable>
        <Pressable disabled={busy} onPress={onRestore} style={styles.secondary}><Ionicons name="cloud-download-outline" size={19} color="#3C343A" /><Text style={styles.secondaryText}>Restaurar do Drive</Text></Pressable>
        <Pressable onPress={onDisconnect} style={styles.signOut}><Text style={styles.signOutText}>Sair ou trocar de conta</Text></Pressable>
      </> : <>
        <Text style={[styles.privacy, { color: colors.muted }]}>Entre com Google no próprio aparelho. O app nunca pede nem armazena sua senha. A sincronização só fica ativa quando o OAuth do projeto estiver configurado.</Text>
        <Pressable disabled={!request || busy} onPress={connect} style={[styles.primary, (!configured || !request) && styles.disabled]}><Ionicons name="logo-google" size={18} color="#2B2227" /><Text style={styles.primaryText}>{configured ? "Entrar com Google" : "Configurar login Google"}</Text></Pressable>
        {!configured && <Text style={[styles.pending, { color: dark ? "#F0A7BE" : "#8B5566" }]}>Login e Drive aguardam um OAuth Client ID; seus dados locais continuam no aparelho.</Text>}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFAFB", borderWidth: 1, borderColor: "#F1E6EA", borderRadius: 21, padding: 16, marginHorizontal: 18, marginTop: 15 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 12 }, googleBadge: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#FFFFFF", borderColor: "#EFE9EC", borderWidth: 1 },
  title: { fontSize: 17, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), color: "#221F22", fontWeight: "700" }, subtitle: { fontSize: 12, color: "#81777E", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 2 },
  account: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 }, email: { fontSize: 14, color: "#262126", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" },
  privacy: { color: "#726A70", fontSize: 13, lineHeight: 20, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginBottom: 12 },
  primary: { minHeight: 46, borderRadius: 15, backgroundColor: "#F2AFC3", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 3 }, primaryText: { fontSize: 14, color: "#2D252A", fontWeight: "700", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  secondary: { minHeight: 43, borderRadius: 14, backgroundColor: "#F5EFF1", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 8 }, secondaryText: { fontSize: 13, color: "#3C343A", fontWeight: "600", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }) },
  signOut: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 15 }, signOutText: { color: "#8B405A", fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "600" },
  disabled: { opacity: 0.65 }, pending: { color: "#8B5566", fontSize: 12, lineHeight: 18, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 9 },
});
