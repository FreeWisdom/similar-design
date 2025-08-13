import { create } from "zustand";

export type useCreateState = {
  genImgResloading: boolean;
  genImgRes: any | null;
  setGenImgResloading: (loading: boolean) => void;
  setGenImgRes: (genImgRes: any | null) => void;
};

export const useCreateStore = create<useCreateState>((set, get) => ({
  genImgResloading: false,
  genImgRes: null,
  setGenImgResloading: (genImgResloading) => set({ genImgResloading }),
  setGenImgRes: (genImgRes) => set({ genImgRes }),
})); 