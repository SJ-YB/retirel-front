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
