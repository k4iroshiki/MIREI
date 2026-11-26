/**
 * Live2DManager.js
 * pixi-live2d-display@0.4.0 + pixi.js@6
 */

import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

// Wajib: daftarkan PIXI ke window
window.PIXI = PIXI;

const MODEL_URL = '/live2d/models/mirei/runtime/mao_pro.model3.json';

export const EMOTION_EXPRESSION_MAP = {
  neutral:  'exp_01',
  happy:    'exp_02',
  laugh:    'exp_03',
  sad:      'exp_04',
  angry:    'exp_05',
  worried:  'exp_06',
  amazed:   'exp_07',
  thinking: 'exp_08',
};

class Live2DManager {
  constructor() {
    this.app        = null;
    this.model      = null;
    this.isReady    = false;
    this._destroyed = false;
    this._initPromise = null; // guard double-init
  }

  async init(container, width, height) {
    // Jika sudah ada init yang berjalan, tunggu hasilnya
    if (this._initPromise) {
      console.log('[Live2D] Init already in progress, waiting...');
      return this._initPromise;
    }

    // Jika sudah ready, skip
    if (this.isReady && this.app && this.model) {
      console.log('[Live2D] Already initialized, skipping...');
      return true;
    }

    this._initPromise = this._doInit(container, width, height);
    return this._initPromise;
  }

  async _doInit(container, width, height) {
    console.log('[Live2D] Starting initialization...');
    try {
      this.app = new PIXI.Application({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Stop ticker dulu — cegah render sebelum texture siap
      this.app.ticker.stop();

      container.appendChild(this.app.view);
      console.log('[Live2D] Canvas appended to container');

      // Load model — autoHitTest & autoFocus menggantikan autoInteract yang deprecated
      console.log('[Live2D] Loading model from:', MODEL_URL);
      this.model = await Live2DModel.from(MODEL_URL, {
        autoHitTest: false,
        autoFocus:   false,
      });
      console.log('[Live2D] Model loaded successfully');

      // Cek apakah sudah di-destroy saat model selesai load (Strict Mode unmount)
      if (this._destroyed) {
        this.model.destroy();
        this.model = null;
        return false;
      }

      this.app.stage.addChild(this.model);

      // Debug: log ukuran model
      console.log('[Live2D] Model size:', this.model.width, 'x', this.model.height);
      console.log('[Live2D] Model internal size:', this.model.internalModel?.originalWidth, 'x', this.model.internalModel?.originalHeight);
      console.log('[Live2D] Canvas size:', width, 'x', height);

      // Tunggu event 'ready' dari model (texture + internalModel sudah siap)
      // lalu baru start ticker agar render pertama tidak crash
      await new Promise((resolve) => {
        // 'ready' sudah di-emit oleh pixi-live2d-display setelah texture loaded
        if (this.model.internalModel) {
          resolve();
        } else {
          this.model.once('ready', resolve);
        }
      });

      if (this._destroyed) return false;

      // Sekarang aman untuk mulai render
      this.app.ticker.start();

      // Fit model setelah internalModel siap
      this._fitModel(width, height);
      console.log('[Live2D] After fit — pos:', this.model.x, this.model.y, 'scale:', this.model.scale.x);
      
      // Debug: cek apakah autoFocus benar-benar off
      console.log('[Live2D] autoFocus status:', this.model.internalModel?.autoFocus);
      
      // Debug: cek struktur internalModel
      if (this.model.internalModel) {
        console.log('[Live2D] InternalModel has focusController:', !!this.model.internalModel.focusController);
      }

      // Idle motion
      this.model.motion('Idle');

      // Head tracking — ikuti cursor di seluruh window
      let mouseX = 0;
      let mouseY = 0;
      
      this._onMouseMove = (e) => {
        // Simpan posisi mouse, update di ticker
        mouseX =  (e.clientX / window.innerWidth)  * 2 - 1;
        mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
      };
      document.addEventListener('mousemove', this._onMouseMove);
      
      // Update focus setiap frame via ticker - gunakan API internalModel
      this.app.ticker.add(() => {
        if (this.model && this.model.internalModel) {
          try {
            // Gunakan method fokusController dari internalModel
            const focusController = this.model.internalModel.focusController;
            if (focusController) {
              // Set target langsung tanpa smoothing berlebihan
              focusController.target.x = mouseX;
              focusController.target.y = mouseY;
              
              // Percepat smoothing dengan mengurangi jarak antara current dan target
              // Semakin besar angka (0-1), semakin cepat responsnya
              const smoothingFactor = 0.3; // Default biasanya 0.15
              focusController.focus.x += (focusController.target.x - focusController.focus.x) * smoothingFactor;
              focusController.focus.y += (focusController.target.y - focusController.focus.y) * smoothingFactor;
            }
          } catch (e) {
            // Silent fail - jangan spam console
          }
        }
      });
      
      console.log('[Live2D] Mouse tracking listener terpasang ✅');

      // Tap interaction — aktifkan event mode agar model bisa menerima klik
      this.model.eventMode = 'static';
      this.model.cursor = 'pointer';

      // Hit detection via event 'hit' dari library
      this.model.on('hit', (hitAreas) => {
        if (hitAreas.includes('HitAreaHead')) {
          this.playMotion('Special');
        } else if (hitAreas.includes('HitAreaBody')) {
          this.playMotion('TapBody');
        } else {
          // Klik area manapun yang tidak spesifik → random TapBody
          this.playMotion('TapBody');
        }
      });

      // Trigger tap saat klik canvas — koordinat relatif ke canvas
      this.app.view.addEventListener('pointerdown', (e) => {
        if (!this.model) return;
        const rect = this.app.view.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.app.view.width  / rect.width);
        const y = (e.clientY - rect.top)  * (this.app.view.height / rect.height);
        this.model.tap(x, y);
      });

      this.isReady = true;
      console.log('[Live2D] Model berhasil di-load ✅');
      return true;

    } catch (err) {
      console.error('[Live2D] Gagal load model:', err);
      return false;
    }
  }

  _fitModel(width, height) {
    if (!this.model) return;

    const modelW = this.model.internalModel?.originalWidth  || this.model.width  || 5800;
    const modelH = this.model.internalModel?.originalHeight || this.model.height || 8400;

    // Model sangat besar (5800x8400), scale berdasarkan lebar canvas
    // Zoom 2x agar setengah badan atas terlihat
    const scale = (width / modelW) * 2.0;

    this.model.scale.set(scale);

    // Posisi horizontal: tengah canvas
    this.model.x = width / 2;

    // Posisi vertikal: geser ke atas agar kepala+dada masuk frame
    // pivot di 20% dari atas model → memotong badan bawah
    this.model.y = height * 0.05;
    this.model.pivot.set(modelW / 2, modelH * 0.12);
  }

  setEmotion(emotion) {
    if (!this.isReady || !this.model) return;
    const exprName = EMOTION_EXPRESSION_MAP[emotion] || EMOTION_EXPRESSION_MAP.neutral;
    try {
      this.model.expression(exprName);
    } catch (e) {
      console.warn('[Live2D] Gagal set expression:', e);
    }
  }

  /**
   * Trigger motion berdasarkan nama grup
   * @param {'Idle'|'TapBody'|'Special'} group
   * @param {number} [index] - index motion dalam grup, random jika tidak diisi
   */
  playMotion(group = 'TapBody', index) {
    if (!this.isReady || !this.model) return;
    try {
      this.model.motion(group, index);
    } catch (e) {
      console.warn('[Live2D] Gagal play motion:', e);
    }
  }

  destroy() {
    console.log('[Live2D] Destroying manager...');
    this._destroyed = true;
    this.isReady    = false;

    // Hapus global event listener
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
      console.log('[Live2D] Mouse listener removed');
    }

    if (this.model) {
      try { 
        this.model.destroy(); 
        console.log('[Live2D] Model destroyed');
      } catch (_) {}
      this.model = null;
    }
    if (this.app) {
      try { 
        this.app.destroy(true, { children: true, texture: true }); 
        console.log('[Live2D] PIXI app destroyed');
      } catch (_) {}
      this.app = null;
    }
    
    this._initPromise = null;
    console.log('[Live2D] Manager destroyed completely');
  }
}

export default Live2DManager;
