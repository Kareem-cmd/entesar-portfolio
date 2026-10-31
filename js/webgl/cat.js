/* ============================================================
   ENTESAR · WebGL halftone cat (OGL)
   A black cat rendered as a dot-matrix that watches the cursor.
   ============================================================ */
import { Renderer, Triangle, Program, Mesh, Texture } from "ogl";

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2  uResolution;
  uniform vec2  uTexSize;
  uniform vec2  uMouse;
  uniform vec2  uOffset;
  uniform vec2  uEyeL;
  uniform vec2  uEyeR;
  uniform float uScale;
  uniform float uFlipY;
  uniform float uDebugRaw;
  uniform float uStare;
  uniform float uTime;
  uniform float uReveal;
  uniform float uGrid;
  varying vec2 vUv;

  // fit the square cat texture into the canvas (contain by height), centered,
  // with a subtle parallax toward the cursor (the gaze follows you).
  vec2 fitUV(vec2 uv) {
    float ca = uResolution.x / uResolution.y;
    float ta = uTexSize.x / uTexSize.y;
    vec2 st = uv - 0.5;
    st.x *= ca / ta;
    st *= uScale;
    st += uOffset;
    st += (uMouse - 0.5) * vec2(0.05, 0.04);
    st += 0.5;
    return st;
  }

  void main() {
    if (uDebugRaw > 0.5) {
      vec2 d = fitUV(vUv);
      vec3 raw = vec3(0.02);
      if (d.x >= 0.0 && d.x <= 1.0 && d.y >= 0.0 && d.y <= 1.0)
        raw = texture2D(tMap, vec2(d.x, abs(uFlipY - d.y))).rgb;
      gl_FragColor = vec4(raw, 1.0);
      return;
    }

    vec2 px   = vUv * uResolution;
    vec2 cell = floor(px / uGrid);
    vec2 ccPx = (cell + 0.5) * uGrid;
    vec2 ccUV = ccPx / uResolution;
    vec2 tuv  = fitUV(ccUV);

    float L = 0.0;
    float eyeCore = 0.0, eyeHalo = 0.0;
    if (tuv.x >= 0.0 && tuv.x <= 1.0 && tuv.y >= 0.0 && tuv.y <= 1.0) {
      vec2 sc = vec2(tuv.x, abs(uFlipY - tuv.y));
      vec3 src = texture2D(tMap, sc).rgb;
      L = dot(src, vec3(0.299, 0.587, 0.114));
      L = pow(L, 0.72);
      float eL = distance(sc, uEyeL);
      float eR = distance(sc, uEyeR);
      eyeCore = max(smoothstep(0.040, 0.0, eL), smoothstep(0.040, 0.0, eR));
      eyeHalo = max(smoothstep(0.130, 0.0, eL), smoothstep(0.130, 0.0, eR));
    }

    // cursor influence (aspect-corrected distance)
    float ar = uResolution.x / uResolution.y;
    float md = distance(ccUV * vec2(ar, 1.0), uMouse * vec2(ar, 1.0));
    float infl = smoothstep(0.24, 0.0, md);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.2);

    // dot radius from luminance + reveal + cursor + eye bloom
    float radius = L * (uGrid * 0.5) * 1.32 * uReveal;
    radius += infl * uGrid * 0.16 * uReveal;
    radius += eyeCore * uGrid * 0.55 * uReveal;

    float d  = distance(px, ccPx);
    float aa = max(uGrid * 0.06, 0.75);
    float dotMask = 1.0 - smoothstep(radius - aa, radius + aa, d);

    // colour
    vec3 fur     = vec3(0.898, 0.870, 0.831);   // #e5ded4
    vec3 sage    = vec3(0.514, 0.663, 0.553);   // #83a98d
    vec3 sageHot = vec3(0.78, 0.97, 0.80);
    vec3 col = mix(fur * (0.5 + 0.5 * L), sageHot, eyeCore);

    vec3 noir = vec3(0.004, 0.0, 0.0);
    vec3 outc = mix(noir, col, dotMask);

    // soft sage bloom over the eyes — pulses, flares toward the cursor, intensifies on "stare"
    outc += sage * eyeHalo * (0.30 + 0.30 * pulse) * (0.7 + infl) * uReveal * (1.0 + uStare * 1.4);

    // a sage glow that trails the cursor across the cat
    outc += sage * infl * 0.30 * uReveal * (0.55 + 0.45 * pulse);

    gl_FragColor = vec4(outc, 1.0);
  }
`;

export class CatScene {
  constructor(container, textureURL) {
    this.container = container;
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.renderer = new Renderer({ alpha: false, dpr: this.dpr, powerPreference: "high-performance" });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0.004, 0, 0, 1);
    container.appendChild(this.gl.canvas);

    this.ready = false;
    this._onReady = null;
    this.texture = new Texture(this.gl, { generateMipmaps: false });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.texture.image = img;
      this.texture.needsUpdate = true;
      this.uTexSize.value = [img.naturalWidth, img.naturalHeight];
      this.ready = true;
      this.render(0); // upload texture immediately
      if (this._onReady) this._onReady();
    };
    img.src = textureURL;

    this.uResolution = { value: [1, 1] };
    this.uTexSize = { value: [1024, 1024] };
    this.uMouse = { value: [0.5, 0.5] };
    this._mouseTarget = [0.5, 0.5];
    this.uOffset = { value: [0.0, 0.0] };
    this.uScale = { value: 1.04 };
    this.uFlipY = { value: 0.0 };
    this.uDebugRaw = { value: 0.0 };
    this.uStare = { value: 0.0 };
    this.uEyeL = { value: [0.36, 0.48] };
    this.uEyeR = { value: [0.64, 0.48] };
    this.uTime = { value: 0 };
    this.uReveal = { value: 0 };
    this.uGrid = { value: 8 * this.dpr };

    this.program = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        tMap: { value: this.texture },
        uResolution: this.uResolution,
        uTexSize: this.uTexSize,
        uMouse: this.uMouse,
        uOffset: this.uOffset,
        uScale: this.uScale,
        uFlipY: this.uFlipY,
        uDebugRaw: this.uDebugRaw,
        uStare: this.uStare,
        uEyeL: this.uEyeL,
        uEyeR: this.uEyeR,
        uTime: this.uTime,
        uReveal: this.uReveal,
        uGrid: this.uGrid,
      },
    });
    this.mesh = new Mesh(this.gl, { geometry: new Triangle(this.gl), program: this.program });

    this._onResize = () => this.resize();
    this._onMove = (e) => {
      this._mouseTarget[0] = e.clientX / window.innerWidth;
      // WebGL Y is bottom-up while clientY is top-down — flip it so the
      // glow tracks the cursor instead of mirroring it.
      this._mouseTarget[1] = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("resize", this._onResize);
    window.addEventListener("pointermove", this._onMove, { passive: true });
    this.resize();
  }

  onReady(cb) {
    if (this.ready) cb();
    else this._onReady = cb;
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.uResolution.value = [this.gl.drawingBufferWidth, this.gl.drawingBufferHeight];
    this.uGrid.value = 8 * this.dpr;
  }

  render(t) {
    this.uTime.value = t;
    this.uMouse.value[0] += (this._mouseTarget[0] - this.uMouse.value[0]) * 0.06;
    this.uMouse.value[1] += (this._mouseTarget[1] - this.uMouse.value[1]) * 0.06;
    this.renderer.render({ scene: this.mesh });
  }
}
