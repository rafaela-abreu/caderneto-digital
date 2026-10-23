import { useMemo, useState } from "react";
import { Platform, Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

export function DrawingPad({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (svg: string) => void }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => setCurrent(`M ${event.nativeEvent.locationX} ${event.nativeEvent.locationY}`),
    onPanResponderMove: event => setCurrent(value => `${value} L ${event.nativeEvent.locationX} ${event.nativeEvent.locationY}`),
    onPanResponderRelease: () => setPaths(value => current ? [...value, current] : value),
  }), [current]);
  const close = () => { setPaths([]); setCurrent(""); onClose(); };
  const save = () => {
    const all = [...paths, current].filter(Boolean).map(d => `<path d="${d}" fill="none" stroke="#232025" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
    onSave(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 360 450"><rect width="360" height="450" fill="#ffffff"/>${all}</svg>`);
    setPaths([]); setCurrent(""); onClose();
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={close}>
    <View style={styles.root}>
      <View style={styles.header}><Pressable onPress={close} style={styles.headerButton}><Ionicons name="close" size={23} color="#252126" /></Pressable><Text style={styles.heading}>Desenho livre</Text><Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>Adicionar</Text></Pressable></View>
      <Text style={styles.hint}>Desenhe com o dedo; o traço será guardado dentro desta nota.</Text>
      <View style={styles.canvas} {...responder.panHandlers}><Svg width="100%" height="100%">{paths.map((d, i) => <Path key={i} d={d} stroke="#232025" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}{!!current && <Path d={current} stroke="#232025" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}</Svg></View>
      <Pressable onPress={() => { setPaths([]); setCurrent(""); }} style={styles.clear}><Text style={styles.clearText}>Limpar desenho</Text></Pressable>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1, paddingTop: 30, paddingHorizontal: 17, backgroundColor: "#FFFFFF" }, header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, heading: { flex: 1, marginLeft: 10, color: "#201D20", fontSize: 20, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" }, save: { backgroundColor: "#F2AFC3", paddingHorizontal: 17, paddingVertical: 10, borderRadius: 13 }, saveText: { color: "#292328", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" }, hint: { color: "#756D73", marginVertical: 10, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontSize: 13 }, canvas: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#E9E2E5", overflow: "hidden", backgroundColor: "#FFFFFF" }, clear: { alignSelf: "center", padding: 15 }, clearText: { color: "#9B4F68", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700" } });
