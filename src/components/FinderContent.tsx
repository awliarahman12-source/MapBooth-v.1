export default function FinderContent() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ width: 140, borderRight: '0.5px solid var(--card-border)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-sub)', fontSize: 10 }}>FAVORITES</div>
        <div style={{ cursor: 'pointer', color: '#007AFF', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#007AFF"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
          AirDrop
        </div>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#A2A2A7"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
          Applications
        </div>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#A2A2A7"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
          Desktop
        </div>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#A2A2A7"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
          Downloads
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, fontSize: 12, textAlign: 'center' }}>
        <div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#5856D6" style={{ marginBottom: 4 }}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
          <div>Tahoe_Design.pdf</div>
        </div>
        <div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#34C759" style={{ marginBottom: 4 }}><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
          <div>Wallpaper.png</div>
        </div>
        <div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#FF9500" style={{ marginBottom: 4 }}><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-4v-2h4v2zm0-4h-4v-2h4v2z" /></svg>
          <div>System_Core.zip</div>
        </div>
      </div>
    </div>
  );
}
