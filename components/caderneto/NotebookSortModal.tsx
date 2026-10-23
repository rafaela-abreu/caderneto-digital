import { Platform, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import type { Notebook } from "../../lib/caderneto/types";

export function NotebookSortModal({ visible, notebooks, onClose, onSave }: { visible: boolean; notebooks: Notebook[]; onClose: () => void; onSave: (items: Notebook[]) => void }) {
  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Notebook>) => (
    <ScaleDecorator>
      <Pressable onLongPress={drag} disabled={isActive} style={[styles.row, isActive && styles.active]}>
        <Text style={styles.position}>{(getIndex() ?? 0) + 1}</Text>
        <View style={styles.book}><Ionicons name="book-outline" size={20} color="#6C4452" /></View>
        <Text numberOfLines={1} style={styles.name}>{item.title}</Text>
        <Ionicons name="reorder-three-outline" size={25} color="#847A80" />
      </Pressable>
    </ScaleDecorator>
  );
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.root}>
      <View style={styles.header}><Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color="#29252A" /></Pressable><View style={{ flex: 1 }}><Text style={styles.title}>Organizar estante</Text><Text style={styles.subtitle}>Segure e arraste cada caderno.</Text></View><Pressable onPress={onClose} style={styles.done}><Text style={styles.doneText}>Concluir</Text></Pressable></View>
      <DraggableFlatList data={notebooks} keyExtractor={item => item.id} renderItem={renderItem} onDragEnd={({ data }) => onSave(data)} contentContainerStyle={styles.list} activationDistance={7} />
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1, paddingTop: 30, backgroundColor: "#FFFFFF" }, header: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEE7EA" }, close: { width: 37, height: 40, alignItems: "center", justifyContent: "center" }, title: { fontSize: 21, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), color: "#211E21", fontWeight: "700" }, subtitle: { fontSize: 12, color: "#81777E", fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), marginTop: 2 }, done: { backgroundColor: "#F2AFC3", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 }, doneText: { fontSize: 13, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "700", color: "#30262C" }, list: { padding: 15 }, row: { height: 64, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 11, backgroundColor: "#FFFAFB", marginBottom: 9, borderRadius: 15, borderWidth: 1, borderColor: "#F0E7EA" }, active: { backgroundColor: "#F8E1E8", borderColor: "#DDA0B3" }, position: { width: 22, color: "#847A80", fontSize: 13, textAlign: "center" }, book: { width: 38, height: 38, backgroundColor: "#F7E5EA", borderRadius: 12, alignItems: "center", justifyContent: "center" }, name: { flex: 1, color: "#2B272A", fontSize: 15, fontFamily: Platform.select({ web: "system-ui", default: "sans-serif-rounded" }), fontWeight: "600" } });
