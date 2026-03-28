import { create } from 'zustand';

// 토스트 알림 타입
interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// 전역 UI 상태 및 액션 타입
interface UiState {
  isLoading: boolean;
  toast: Toast | null;
  // 전역 로딩 상태 제어
  setLoading: (isLoading: boolean) => void;
  // 토스트 알림 표시
  showToast: (toast: Toast) => void;
  // 토스트 알림 숨김
  hideToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isLoading: false,
  toast: null,
  setLoading: (isLoading) => set({ isLoading }),
  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null }),
}));
