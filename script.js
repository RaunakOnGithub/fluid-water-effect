
// Toggle controls visibility
function toggleControls() {
  const controls = document.getElementById("controls");
  controls.style.display =
    controls.style.display === "none" ? "block" : "none";
}

// Parameters

const params = {
  rippleSize: 0.010,
  rippleIntensity: 1.5,
  damping: 0.970,
  fishSpeed: 2.0,
  fishCount: 10,
};



//  const params = {
//   rippleSize: 0.02,       
//   rippleIntensity: 1.0,   
//   damping: 0.97,          
//   fishSpeed: 2.0,
//   fishCount: 8,
//   leafCount: 15,
// };


// Fish class
class Fish {
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.size = 15 + Math.random() * 10;
    this.angle = Math.random() * Math.PI * 2;
    this.color = `hsla(${180 + Math.random() * 60}, 70%, 60%, 0.6)`;
  }

  update(mouse, width, height) {
    // Move fish
    this.x += this.vx * params.fishSpeed * 0.5;
    this.y += this.vy * params.fishSpeed * 0.5;

    // Bounce off edges
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // Keep in bounds
    this.x = Math.max(0, Math.min(width, this.x));
    this.y = Math.max(0, Math.min(height, this.y));

    // Update angle
    this.angle = Math.atan2(this.vy, this.vx);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw fish body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw tail
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(-this.size * 1.5, -this.size * 0.4);
    ctx.lineTo(-this.size * 1.5, this.size * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

class Leaf {
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.5; // Slow movement
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = 20 + Math.random() * 15;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.color = `hsla(${100 + Math.random() * 40}, 60%, 40%, 0.8)`; // Green shades
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Wrap around edges
    if (this.x < -this.size) this.x = width + this.size;
    if (this.x > width + this.size) this.x = -this.size;
    if (this.y < -this.size) this.y = height + this.size;
    if (this.y > height + this.size) this.y = -this.size;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Leaf shape
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaf vein
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.7, 0);
    ctx.lineTo(this.size * 0.7, 0);
    ctx.stroke();

    ctx.restore();
  }
}

// Shaders
const simulationVertexShader = `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `;

const simulationFragmentShader = `
      uniform sampler2D textureA;
      uniform vec2 mouse;
      uniform vec2 resolution;
      uniform float time;
      uniform int frame;
      uniform float rippleSize;
      uniform float rippleIntensity;
      uniform float damping;
      varying vec2 vUv;

      const float delta = 1.4;

      void main() {
          vec2 uv = vUv;
          if (frame == 0) {
              gl_FragColor = vec4(0.0);
              return;
          }

          vec4 data = texture2D(textureA, uv);
          float pressure = data.x;
          float pVel = data.y;

          vec2 texelSize = 1.0 / resolution;
          
          float p_right = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;
          float p_left = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;
          float p_up = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;
          float p_down = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;

          if (uv.x <= texelSize.x) p_left = p_right;
          if (uv.x >= 1.0 - texelSize.x) p_right = p_left;
          if (uv.y <= texelSize.y) p_down = p_up;
          if (uv.y >= 1.0 - texelSize.y) p_up = p_down;

          pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
          pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;

          pressure += delta * pVel;
          pVel -= 0.005 * delta * pressure;
          pVel *= 1.0 - 0.002 * delta;
          pressure *= damping;

          vec2 mouseUV = (mouse + 1.0) * 0.5;
          if(mouse.x != 0.0 || mouse.y != 0.0) {
              float dist = distance(uv, mouseUV);
              if(dist <= rippleSize) {
                  float strength = 1.0 - dist / rippleSize;
                  pressure += rippleIntensity * strength;
              }
          }

          gl_FragColor = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);
      }
  `;

const renderVertexShader = `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `;

const renderFragmentShader = `
      uniform sampler2D textureA;
      uniform sampler2D textureB;
      varying vec2 vUv;
      
      void main() {
          vec4 data = texture2D(textureA, vUv);
          vec2 distortion = 0.3 * data.zw;
          vec4 color = texture2D(textureB, vUv + distortion);
          
          vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
          vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
          float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.5;

          gl_FragColor = color + vec4(specular);
      }
  `;

// Main setup
const scene = new THREE.Scene();
const simScene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document
  .getElementById("canvas-container")
  .appendChild(renderer.domElement);

const mouse = new THREE.Vector2();
const mouseVelocity = new THREE.Vector2();
const prevMouse = new THREE.Vector2();
let frame = 0;

const width = window.innerWidth * window.devicePixelRatio;
const height = window.innerHeight * window.devicePixelRatio;

const options = {
  format: THREE.RGBAFormat,
  type: THREE.FloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  stencilBuffer: false,
  depthBuffer: false,
};

let rtA = new THREE.WebGLRenderTarget(width, height, options);
let rtB = new THREE.WebGLRenderTarget(width, height, options);

const simMaterial = new THREE.ShaderMaterial({
  uniforms: {
    textureA: { value: null },
    mouse: { value: mouse },
    mouseVelocity: { value: mouseVelocity },
    resolution: { value: new THREE.Vector2(width, height) },
    time: { value: 0 },
    frame: { value: 0 },
    rippleSize: { value: params.rippleSize },
    rippleIntensity: { value: params.rippleIntensity },
    damping: { value: params.damping },
  },
  vertexShader: simulationVertexShader,
  fragmentShader: simulationFragmentShader,
});

const renderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    textureA: { value: null },
    textureB: { value: null },
  },
  vertexShader: renderVertexShader,
  fragmentShader: renderFragmentShader,
  transparent: true,
});

const plane = new THREE.PlaneGeometry(2, 2);
const simQuad = new THREE.Mesh(plane, simMaterial);
const renderQuad = new THREE.Mesh(plane, renderMaterial);

simScene.add(simQuad);
scene.add(renderQuad);

const canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext("2d", { alpha: true });

const fishes = [];
for (let i = 0; i < params.fishCount; i++) {
  fishes.push(new Fish(width, height));
}

const leaves = [];
for (let i = 0; i < 15; i++) {
  // 15 leaves
  leaves.push(new Leaf(width, height));
}

const textTexture = new THREE.CanvasTexture(canvas);
textTexture.minFilter = THREE.LinearFilter;
textTexture.magFilter = THREE.LinearFilter;
textTexture.format = THREE.RGBAFormat;

// Control event listeners
["rippleSize", "rippleIntensity", "damping", "fishSpeed"].forEach(
  (id) => {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(id + "-value");

    slider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      params[id] = value;
      valueDisplay.textContent = value.toFixed(3);

      if (id !== "fishSpeed") {
        simMaterial.uniforms[id].value = value;
      }
    });
  }
);

window.addEventListener("resize", () => {
  const newWidth = window.innerWidth * window.devicePixelRatio;
  const newHeight = window.innerHeight * window.devicePixelRatio;

  renderer.setSize(window.innerWidth, window.innerHeight);
  rtA.setSize(newWidth, newHeight);
  rtB.setSize(newWidth, newHeight);
  simMaterial.uniforms.resolution.value.set(newWidth, newHeight);

  canvas.width = newWidth;
  canvas.height = newHeight;
  textTexture.needsUpdate = true;
});

renderer.domElement.addEventListener("mousemove", (event) => {
  prevMouse.copy(mouse);
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);

  mouseVelocity.x = mouse.x - prevMouse.x;
  mouseVelocity.y = mouse.y - prevMouse.y;
});

renderer.domElement.addEventListener("mouseleave", () => {
  mouse.set(0, 0);
  mouseVelocity.set(0, 0);
});

function animate() {
  simMaterial.uniforms.frame.value = frame++;
  simMaterial.uniforms.time.value = performance.now() / 1000;

  // Draw background
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width
  );
  gradient.addColorStop(0, "#1e3a8a");
  gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update and draw fish
  fishes.forEach((fish) => {
    fish.update(mouse, canvas.width, canvas.height);
    fish.draw(ctx);
  });

  // Update and draw leaves
  leaves.forEach((leaf) => {
    leaf.update(canvas.width, canvas.height);
    leaf.draw(ctx);
  });

  // Draw text
  const fontSize = Math.round(250 * window.devicePixelRatio);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fontSize}px Poppins, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Fluid", canvas.width / 2, canvas.height / 2);

  textTexture.needsUpdate = true;

  // Render
  simMaterial.uniforms.textureA.value = rtA.texture;
  renderer.setRenderTarget(rtB);
  renderer.render(simScene, camera);

  renderMaterial.uniforms.textureA.value = rtB.texture;
  renderMaterial.uniforms.textureB.value = textTexture;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  const temp = rtA;
  rtA = rtB;
  rtB = temp;

  requestAnimationFrame(animate);
}

animate();
