function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--text-3)',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '0.14em',
      }}
    >
      LOADING…
    </div>
  )
}

export default PageFallback
