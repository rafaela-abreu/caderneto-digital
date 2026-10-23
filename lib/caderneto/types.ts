export type Notebook = {
  id: string;
  ownerId: string;
  parentId: string | null;
  title: string;
  coverUri: string | null;
  sortOrder: number;
  createdAt: number;
};

export type Attachment = {
  id: string;
  uri: string;
  kind: "image" | "audio" | "drawing" | "file";
  name?: string;
};

export type Note = {
  id: string;
  ownerId: string;
  notebookId: string | null;
  title: string;
  content: string;
  updatedAt: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  locked: boolean;
  color: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  textColor: string;
  reminderAt: number | null;
  attachments: Attachment[];
};

export type AppSettings = {
  theme: "light" | "dark";
  language: "pt-BR" | "en" | "es";
  notifications: boolean;
  clipboardEnabled: boolean;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
  weekStartsOn: 0 | 1;
  timezone: string;
  introSeen: boolean;
  soundEnabled: boolean;
  ownerId: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  language: "pt-BR",
  notifications: true,
  clipboardEnabled: true,
  pinEnabled: false,
  biometricEnabled: false,
  dateFormat: "dd/MM/yyyy",
  weekStartsOn: 0,
  timezone: "America/Sao_Paulo",
  introSeen: false,
  soundEnabled: true,
  ownerId: "device",
};

export const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
