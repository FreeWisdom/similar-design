import { create } from "zustand";

export type useCreateState = {
  genImgResloading: boolean;
  genImgRes: any[];
  setGenImgResloading: (loading: boolean) => void;
  setGenImgRes: (genImgRes: any[]) => void;
  addItem: (newItem: any) => void;
};

export const useCreateStore = create<useCreateState>((set, get) => ({
  genImgResloading: false,
  genImgRes: [],
  setGenImgResloading: (genImgResloading) => set({ genImgResloading }),
  setGenImgRes: (genImgRes) => set({ genImgRes }),
  addItem: (newItem) =>
    set((state) => ({
      ...state,
      genImgRes: [...state.genImgRes, newItem] // 不可变添加
    })),
}));