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

const savedToken = localStorage.getItem('token');
const savedUser = localStorage.getItem('user');

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken,
  isAuthenticated: !!savedToken,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
