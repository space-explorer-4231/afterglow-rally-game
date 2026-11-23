import { create } from 'zustand';
interface RestartState { deadline: number; setDeadline: (deadline: number) => void }
export const useRestartStore = create<RestartState>(set => ({ deadline: 0, setDeadline: deadline => set({ deadline }) }));
