/**
 * Live2DCanvas.jsx
 * Komponen React untuk menampilkan model Live2D MIREI via PixiJS
 */

import { useEffect, useRef, useState } from 'react';
import Live2DManager from './Live2DManager.js';
import './live2d.css';

const Live2DCanvas = ({
  emotion   = 'neutral',
  isLoading = false,
  width     = 260,
  height    = 360,
}) => {
  const containerRef = useRef(null);
  const managerRef   = useRef(null);
  const initedRef    = useRef(false); // guard React Strict Mode double-invoke
  const [status, setStatus] = useState('loading');

  // ── Init saat mount ─────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Guard: jangan init ulang jika sudah ada manager aktif atau sedang init
    if (managerRef.current || initedRef.current) return;

    // Tandai sedang init
    initedRef.current = true;

    const manager = new Live2DManager();
    managerRef.current = manager;

    manager.init(container, width, height).then((ok) => {
      // Cek apakah component masih mounted
      if (managerRef.current === manager) {
        setStatus(ok ? 'ready' : 'error');
      }
    });

    return () => {
      // Cleanup hanya jika manager masih sama (belum di-replace)
      if (managerRef.current === manager) {
        manager.destroy();
        managerRef.current = null;
        initedRef.current  = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update expression saat emotion / isLoading berubah ──────
  useEffect(() => {
    if (!managerRef.current?.isReady) return;
    const target = isLoading ? 'thinking' : emotion;
    managerRef.current.setEmotion(target);
  }, [emotion, isLoading]);

  return (
    <div
      className="live2d-wrapper"
      style={{ width, height }}
    >
      {/* PixiJS akan inject canvas ke sini */}
      <div
        ref={containerRef}
        className="live2d-pixi-container"
        style={{ width, height }}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="live2d-overlay">
          <div className="live2d-loading-spinner" />
          <span className="live2d-loading-text">Memuat Mirei...</span>
        </div>
      )}

      {/* Error fallback */}
      {status === 'error' && (
        <div className="live2d-overlay live2d-error">
          <span style={{ fontSize: '32px' }}>😔</span>
          <span className="live2d-loading-text">Gagal memuat model</span>
        </div>
      )}
    </div>
  );
};

export default Live2DCanvas;
