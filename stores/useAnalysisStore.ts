import { create } from "zustand";

export type useAnalysisState = {
  files: File[];
  loading: boolean;
  result: any | null;
  contentText: string;
  setFiles: (files: File[]) => void;
  addFiles: (incoming: File[]) => void;
  clearFiles: () => void;
  setLoading: (loading: boolean) => void;
  setResult: (result: any | null) => void;
  setContentText: (text: string) => void;
};

export const useAnalysisStore = create<useAnalysisState>((set, get) => ({
  files: [],
  loading: false,
  result: null,
  contentText: "",
  setFiles: (files) => set({ files }),
  addFiles: (incoming) => set({ files: [...get().files, ...incoming] }),
  clearFiles: () => set({ files: [] }),
  setLoading: (loading) => set({ loading }),
  setResult: (result) => set({ result }),
  setContentText: (text) => set({ contentText: text }),
})); 