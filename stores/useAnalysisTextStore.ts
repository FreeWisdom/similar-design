import { create } from "zustand";

export type useAnalysisTextState = {
  // files: File[];
  anaTextLoading: boolean;
  anaTextRes: any | null;
  contentText: string;
  // setFiles: (files: File[]) => void;
  // addFiles: (incoming: File[]) => void;
  // clearFiles: () => void;
  setAnaTextLoading: (loading: boolean) => void;
  setAnaTextRes: (AnaTextRes: any | null) => void;
  setContentText: (text: string) => void;
};

export const useAnalysisTextStore = create<useAnalysisTextState>((set, get) => ({
  // files: [],
  anaTextLoading: false,
  anaTextRes: null,
  contentText: "",
  // setFiles: (files) => set({ files }),
  // addFiles: (incoming) => set({ files: [...get().files, ...incoming] }),
  // clearFiles: () => set({ files: [] }),
  setAnaTextLoading: (anaTextLoading) => set({ anaTextLoading }),
  setAnaTextRes: (anaTextRes) => set({ anaTextRes }),
  setContentText: (text) => set({ contentText: text }),
})); 