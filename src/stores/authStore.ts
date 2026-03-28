import { create } from 'zustand';

// 사용자 정보 타입
interface User {
  id: string;
  email: string;
  name: string;
}

// 인증 상태 및 액션 타입
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  // 로그인 성공 시 user와 token을 저장하고 isAuthenticated를 true로 설정
  setAuth: (user: User, token: string) => void;
  // 로그아웃 시 인증 상태 초기화
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
}));
