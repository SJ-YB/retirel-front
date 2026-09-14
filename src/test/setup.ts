import '@testing-library/jest-dom'

// jsdom에는 ResizeObserver가 없어서, 이를 쓰는 antd 오버레이(Popconfirm 등)
// 컴포넌트가 테스트에서 깨진다. 최소 스텁으로 폴리필한다.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
}

// jsdom에는 matchMedia도 없다. antd의 반응형 훅(Table·Form의 useBreakpoint 등)이
// 마운트 시 이를 구독하므로, 질의에 항상 '해당 없음'으로 답하는 스텁을 둔다
// (테스트는 데스크톱 레이아웃을 기준으로 한다).
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
