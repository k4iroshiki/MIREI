/**
 * Live2DManager.ts
 * Menggunakan Cubism Web Framework langsung (tanpa pixi-live2d-display)
 */

import { CubismFramework, Option } from '../../cubism4/live2dcubismframework';
import { CubismDefaultParameterId } from '../../cubism4/cubismdefaultparameterid';
import { CubismModelSettingJson } from '../../cubism4/cubismmodelsettingjson';
import { CubismUserModel } from '../../cubism4/model/cubismusermodel';
import { CubismMatrix44 } from '../../cubism4/math/cubismmatrix44';
import { CubismMoc } from '../../cubism4/model/cubismmoc';
import { CubismRenderer_WebGL } from '../../cubism4/rendering/cubismrenderer_webgl';
import { CubismShaderManager_WebGL } from '../../cubism4/rendering/cubismshader_webgl';
import { CubismIdManager } from '../../cubism4/id/cubismidmanager';

const MODEL_BASE_URL = '/live2d/models/mirei/runtime/';
const MODEL_JSON     = 'mao_pro.model3.json';

export const EMOTION_EXPRESSION_MAP: Record<string, string> = {
  neutral:  'exp_01',
  happy:    'exp_02',
  laugh:    'exp_03',
  sad:      'exp_04',
  angry:    'exp_05',
  worried:  'exp_06',
  amazed:   'exp_07',
  thinking: 'exp_08',
};

// ── Fetch helper ─────────────────────────────────────────────────
async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return res.arrayBuffer();
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return res.json();
}

// ── MireiModel — wraps CubismUserModel ───────────────────────────
class MireiModel extends CubismUserModel {
  private _modelSetting: CubismModelSettingJson | null = null;
  private _gl: WebGLRenderingContext;
  private _canvas: HTMLCanvasElement;
  private _expressionMap: Map<string, any> = new Map();

  constructor(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    super();
    this._gl = gl;
    this._canvas = canvas;
  }

  async load(): Promise<void> {
    // 1. Load model3.json
    const settingJson = await fetchJson(MODEL_BASE_URL + MODEL_JSON);
    const settingStr  = JSON.stringify(settingJson);
    const settingBuf  = new TextEncoder().encode(settingStr).buffer;
    this._modelSetting = new CubismModelSettingJson(settingBuf, settingBuf.byteLength);

    // 2. Load .moc3
    const mocPath = MODEL_BASE_URL + this._modelSetting.getModelFileName();
    const mocBuf  = await fetchArrayBuffer(mocPath);
    this.loadModel(mocBuf, mocBuf.byteLength);

    // 3. Setup renderer dengan shader path yang benar
    this.createRenderer();
    const renderer = this.getRenderer() as CubismRenderer_WebGL;

    // Set shader path ke folder public
    const shaderManager = CubismShaderManager_WebGL.getInstance();
    const shader = shaderManager.getShader(this._gl);
    if (shader) {
      shader.setShaderPath('/live2d/shaders/');
    }

    renderer.initialize(this._model!);
    renderer.startUp(this._gl);
    renderer.setIsPremultipliedAlpha(true);

    // 4. Load textures
    const texCount = this._modelSetting.getTextureCount();
    for (let i = 0; i < texCount; i++) {
      const texPath = MODEL_BASE_URL + this._modelSetting.getTextureFileName(i);
      const tex = await this._loadTexture(texPath);
      renderer.bindTexture(i, tex);
    }

    // 5. Load expressions
    const exprCount = this._modelSetting.getExpressionCount();
    for (let i = 0; i < exprCount; i++) {
      const name = this._modelSetting.getExpressionName(i);
      const path = MODEL_BASE_URL + this._modelSetting.getExpressionFileName(i);
      const buf  = await fetchArrayBuffer(path);
      const expr = this.loadExpression(buf, buf.byteLength, name);
      if (expr) this._expressionMap.set(name, expr);
    }

    // 6. Load motions
    const motionGroupCount = this._modelSetting.getMotionGroupCount();
    for (let g = 0; g < motionGroupCount; g++) {
      const group = this._modelSetting.getMotionGroupName(g);
      const count = this._modelSetting.getMotionCount(group);
      for (let i = 0; i < count; i++) {
        const path = MODEL_BASE_URL + this._modelSetting.getMotionFileName(group, i);
        const buf  = await fetchArrayBuffer(path);
        const motion = this.loadMotion(buf, buf.byteLength, `${group}_${i}`);
        if (motion) {
          const fadeIn  = this._modelSetting.getMotionFadeInTimeValue(group, i);
          const fadeOut = this._modelSetting.getMotionFadeOutTimeValue(group, i);
          if (fadeIn  >= 0) motion.setFadeInTime(fadeIn);
          if (fadeOut >= 0) motion.setFadeOutTime(fadeOut);
        }
      }
    }

    // 7. Load physics
    const physicsPath = this._modelSetting.getPhysicsFileName();
    if (physicsPath) {
      const buf = await fetchArrayBuffer(MODEL_BASE_URL + physicsPath);
      this.loadPhysics(buf, buf.byteLength);
    }

    // 8. Load pose
    const posePath = this._modelSetting.getPoseFileName();
    if (posePath) {
      const buf = await fetchArrayBuffer(MODEL_BASE_URL + posePath);
      this.loadPose(buf, buf.byteLength);
    }

    // Start idle motion via motionManager
    const idleCount = this._modelSetting.getMotionCount('Idle');
    console.log('[Live2D] Idle motion count:', idleCount);
    if (idleCount > 0) {
      const idlePath = MODEL_BASE_URL + this._modelSetting.getMotionFileName('Idle', 0);
      console.log('[Live2D] Loading idle from:', idlePath);
      const idleBuf  = await fetchArrayBuffer(idlePath);
      console.log('[Live2D] Idle buffer size:', idleBuf.byteLength);
      const idleMotion = this.loadMotion(idleBuf, idleBuf.byteLength, 'Idle_0');
      console.log('[Live2D] Idle motion created:', idleMotion);
      if (idleMotion && this._motionManager) {
        this._motionManager.startMotionPriority(idleMotion, false, 1);
      }
    }
  }

  private _loadTexture(url: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
      const gl  = this._gl;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        resolve(tex);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  setExpression(name: string): void {
    const expr = this._expressionMap.get(name);
    if (expr && this._expressionManager) {
      this._expressionManager.startMotionPriority(expr, false, 2);
    }
  }

  update(deltaTime: number, mouseX: number, mouseY: number): void {
    if (!this._model) return;

    // Head tracking via parameters langsung
    this._model.addParameterValueById(
      CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleX),
      mouseX * 30
    );
    this._model.addParameterValueById(
      CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleY),
      mouseY * 30
    );
    this._model.addParameterValueById(
      CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamBodyAngleX),
      mouseX * 10
    );
    this._model.addParameterValueById(
      CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamEyeBallX),
      mouseX
    );
    this._model.addParameterValueById(
      CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamEyeBallY),
      mouseY
    );

    if (this._breath) this._breath.updateParameters(this._model, deltaTime);
    if (this._expressionManager) this._expressionManager.updateMotion(this._model, deltaTime);
    // Sementara skip motion update untuk debug
    // if (this._motionManager) this._motionManager.updateMotion(this._model, deltaTime);
    if (this._physics) this._physics.evaluate(this._model, deltaTime);
    if (this._pose) this._pose.updateParameters(this._model, deltaTime);

    this._model.update();
  }

  draw(matrix: CubismMatrix44): void {
    if (!this._model) return;
    const renderer = this.getRenderer() as CubismRenderer_WebGL;
    renderer.setMvpMatrix(matrix);
    renderer.drawModel();
  }
}

// ── Live2DManager ─────────────────────────────────────────────────
class Live2DManager {
  private _canvas: HTMLCanvasElement | null = null;
  private _gl: WebGLRenderingContext | null = null;
  private _model: MireiModel | null = null;
  private _rafId: number | null = null;
  private _lastTime: number = 0;
  private _mouseX: number = 0;
  private _mouseY: number = 0;
  private _destroyed: boolean = false;

  public isReady: boolean = false;

  async init(container: HTMLElement, width: number, height: number): Promise<boolean> {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width  = width  * (window.devicePixelRatio || 1);
      canvas.height = height * (window.devicePixelRatio || 1);
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
      container.appendChild(canvas);
      this._canvas = canvas;

      // Setup WebGL
      const gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      }) as WebGLRenderingContext;

      if (!gl) throw new Error('WebGL not available');
      this._gl = gl;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      // Init Cubism Framework
      const option = new Option();
      option.logFunction = console.log;
      option.loggingLevel = 3; // verbose
      CubismFramework.startUp(option);
      CubismFramework.initialize();

      // Load model
      this._model = new MireiModel(gl, canvas);
      await this._model.load();

      if (this._destroyed) return false;

      // Mouse tracking
      window.addEventListener('mousemove', this._onMouseMove);

      this.isReady = true;
      this._startRenderLoop();
      console.log('[Live2D] Model berhasil di-load ✅');
      return true;

    } catch (err) {
      console.error('[Live2D] Gagal load model:', err);
      return false;
    }
  }

  private _onMouseMove = (e: MouseEvent): void => {
    if (!this._canvas) return;
    const rect = this._canvas.getBoundingClientRect();
    this._mouseX = (e.clientX - rect.left) / rect.width  * 2 - 1;
    this._mouseY = -((e.clientY - rect.top)  / rect.height * 2 - 1);
  };

  private _startRenderLoop(): void {
    const loop = (timestamp: number) => {
      if (this._destroyed) return;
      const delta = Math.min((timestamp - this._lastTime) / 1000, 0.1);
      this._lastTime = timestamp;
      this._tick(delta);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  private _tick(delta: number): void {
    if (!this._gl || !this._canvas || !this._model) return;

    const gl     = this._gl;
    const canvas = this._canvas;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this._model.update(delta, this._mouseX, this._mouseY);

    // Build MVP matrix
    const aspect = canvas.width / canvas.height;
    const matrix = new CubismMatrix44();
    matrix.scale(1 / aspect, 1);
    matrix.translateY(-0.2);

    this._model.draw(matrix);
  }

  setEmotion(emotion: string): void {
    if (!this.isReady || !this._model) return;
    const exprName = EMOTION_EXPRESSION_MAP[emotion] || EMOTION_EXPRESSION_MAP.neutral;
    this._model.setExpression(exprName);
  }

  destroy(): void {
    this._destroyed = true;
    window.removeEventListener('mousemove', this._onMouseMove);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._model) {
      this._model.release();
      this._model = null;
    }
    CubismFramework.dispose();
    this.isReady = false;
  }
}

export default Live2DManager;
