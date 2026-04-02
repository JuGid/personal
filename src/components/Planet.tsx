import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import type { Campus } from '../types'

// Types de planètes - plus de diversité
type PlanetType = 'rocky' | 'gasGiant' | 'ice' | 'lava' | 'ocean' | 'desert' | 'toxic' | 'crystal'

// Shader de base pour les planètes
const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Simplex noise commun
const noiseGLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }
`

// Shader pour planète rocheuse
const rockyFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = fbm(pos * 3.0);
    float n2 = fbm(pos * 6.0 + vec3(100.0));
    float n3 = snoise(pos * 12.0 + vec3(200.0));

    // Terrain avec montagnes et vallées
    vec3 mountainColor = baseColor * 1.2;
    vec3 valleyColor = secondaryColor * 0.6;
    vec3 craterColor = baseColor * 0.3;

    float terrain = smoothstep(-0.3, 0.3, n1);
    vec3 surfaceColor = mix(valleyColor, mountainColor, terrain);

    // Cratères
    float craters = smoothstep(0.35, 0.4, n3);
    surfaceColor = mix(surfaceColor, craterColor, craters * 0.6);

    // Détails de surface
    float details = n2 * 0.15;
    surfaceColor += vec3(details);

    // Éclairage depuis le soleil
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.15;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.85);

    // Rim lighting
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += baseColor * pow(rim, 4.0) * 0.2;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour géante gazeuse (style Jupiter/Saturn)
const gasGiantFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    // Bandes horizontales caractéristiques
    float bands = sin(vPosition.y * 8.0 + snoise(pos * 2.0) * 2.0) * 0.5 + 0.5;
    float bands2 = sin(vPosition.y * 15.0 + snoise(pos * 3.0 + vec3(50.0)) * 1.5) * 0.5 + 0.5;

    // Tempêtes et tourbillons
    float storm = snoise(pos * 4.0 + vec3(time * 0.05, 0.0, 0.0));
    float storm2 = snoise(pos * 8.0 - vec3(time * 0.03, 0.0, 0.0));

    // Grande tache (style Jupiter)
    vec3 stormCenter = vec3(0.5, 0.3, 0.0) + vec3(seed * 0.001);
    float distToStorm = length(vPosition - stormCenter);
    float greatSpot = smoothstep(0.5, 0.2, distToStorm);

    // Couleurs
    vec3 bandColor1 = baseColor;
    vec3 bandColor2 = secondaryColor;
    vec3 bandColor3 = mix(baseColor, vec3(1.0, 0.9, 0.8), 0.3);
    vec3 stormColor = mix(baseColor, vec3(0.9, 0.5, 0.3), 0.5);

    vec3 surfaceColor = mix(bandColor1, bandColor2, bands);
    surfaceColor = mix(surfaceColor, bandColor3, bands2 * 0.4);
    surfaceColor += vec3(storm * 0.1, storm * 0.08, storm * 0.05);
    surfaceColor = mix(surfaceColor, stormColor, greatSpot * 0.7);

    // Turbulence subtile
    surfaceColor += vec3(storm2 * 0.05);

    // Éclairage
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.2;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.8);

    // Atmosphère brillante sur les bords
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += baseColor * pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète de glace
const iceFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = fbm(pos * 2.0);
    float n2 = snoise(pos * 5.0);
    float cracks = abs(snoise(pos * 10.0));

    // Calottes polaires
    float polar = smoothstep(0.6, 0.9, abs(vPosition.y));

    // Couleurs de glace
    vec3 iceColor = baseColor;
    vec3 deepIce = secondaryColor;
    vec3 snowColor = vec3(0.95, 0.97, 1.0);
    vec3 crackColor = baseColor * 0.4;

    vec3 surfaceColor = mix(deepIce, iceColor, smoothstep(-0.2, 0.3, n1));
    surfaceColor = mix(surfaceColor, snowColor, polar);

    // Fissures dans la glace
    float crackLines = smoothstep(0.85, 0.9, cracks);
    surfaceColor = mix(surfaceColor, crackColor, crackLines * 0.5);

    // Reflets cristallins
    float sparkle = pow(max(0.0, snoise(pos * 20.0)), 8.0);
    surfaceColor += vec3(sparkle * 0.3);

    // Éclairage
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.25;

    // Specular pour effet brillant
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);

    vec3 finalColor = surfaceColor * (ambient + diff * 0.75) + vec3(spec * 0.3);

    // Rim bleuté
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(0.5, 0.7, 1.0) * pow(rim, 3.0) * 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète de lave
const lavaFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = fbm(pos * 2.0 + vec3(time * 0.02, 0.0, 0.0));
    float n2 = snoise(pos * 4.0 - vec3(0.0, time * 0.01, 0.0));
    float n3 = snoise(pos * 8.0);

    // Croûte et lave
    float crustPattern = smoothstep(0.0, 0.3, n1);

    vec3 lavaColor = vec3(1.0, 0.3, 0.0);
    vec3 hotLava = vec3(1.0, 0.8, 0.2);
    vec3 crustColor = baseColor * 0.2;
    vec3 darkCrust = vec3(0.1, 0.05, 0.02);

    // Lave qui coule
    vec3 lava = mix(lavaColor, hotLava, smoothstep(0.3, 0.7, n2));

    // Surface
    vec3 surfaceColor = mix(lava, crustColor, crustPattern);
    surfaceColor = mix(surfaceColor, darkCrust, smoothstep(0.5, 0.8, n3) * crustPattern);

    // Fissures lumineuses
    float cracks = smoothstep(0.7, 0.75, abs(snoise(pos * 15.0)));
    surfaceColor = mix(surfaceColor, hotLava, cracks * (1.0 - crustPattern * 0.5));

    // Émission de lumière propre
    float emission = (1.0 - crustPattern) * 0.8 + cracks * 0.5;

    // Éclairage
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.1;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.5) + surfaceColor * emission * 0.5;

    // Rim de chaleur
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(1.0, 0.4, 0.1) * pow(rim, 2.0) * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète océanique
const oceanFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    // Vagues et courants océaniques
    float waves = sin(pos.x * 8.0 + time * 0.5) * sin(pos.z * 6.0 + time * 0.3);
    float deepWater = fbm(pos * 2.0 + vec3(time * 0.02, 0.0, time * 0.01));
    float shallows = snoise(pos * 4.0 + vec3(time * 0.05));

    // Îles et continents (peu nombreux)
    float landMass = smoothstep(0.55, 0.65, fbm(pos * 1.5));

    // Couleurs de l'océan
    vec3 deepOcean = baseColor * 0.4;
    vec3 shallowWater = baseColor;
    vec3 waveHighlight = vec3(0.8, 0.9, 1.0);
    vec3 landColor = secondaryColor * 0.7;

    vec3 surfaceColor = mix(deepOcean, shallowWater, smoothstep(-0.3, 0.3, deepWater));
    surfaceColor += waveHighlight * waves * 0.1;
    surfaceColor = mix(surfaceColor, landColor, landMass);

    // Reflets spéculaires sur l'eau
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0) * (1.0 - landMass);

    float ambient = 0.2;
    vec3 finalColor = surfaceColor * (ambient + diff * 0.8) + vec3(spec * 0.4);

    // Rim bleuté
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(0.3, 0.5, 0.8) * pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète désertique
const desertFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    // Dunes de sable
    float dunes = sin(pos.x * 10.0 + snoise(pos * 2.0) * 3.0) * 0.5 + 0.5;
    float duneDetail = fbm(pos * 5.0);
    float rocks = smoothstep(0.6, 0.7, snoise(pos * 3.0));

    // Canyons
    float canyon = smoothstep(0.4, 0.45, abs(snoise(pos * 1.5)));

    // Couleurs du désert
    vec3 sandLight = baseColor * 1.3;
    vec3 sandDark = baseColor * 0.7;
    vec3 rockColor = secondaryColor * 0.5;
    vec3 canyonColor = baseColor * 0.3;

    vec3 surfaceColor = mix(sandDark, sandLight, dunes);
    surfaceColor = mix(surfaceColor, surfaceColor * (0.8 + duneDetail * 0.2), 1.0);
    surfaceColor = mix(surfaceColor, rockColor, rocks);
    surfaceColor = mix(surfaceColor, canyonColor, (1.0 - canyon) * 0.6);

    // Éclairage chaud
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.15;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.85);

    // Rim orangé/doré
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(1.0, 0.6, 0.2) * pow(rim, 4.0) * 0.25;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète toxique
const toxicFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    // Marais toxiques et fumées
    float toxic = fbm(pos * 2.0 + vec3(time * 0.03, time * 0.02, 0.0));
    float bubbles = pow(max(0.0, snoise(pos * 15.0 + vec3(time * 0.5))), 4.0);
    float acidPools = smoothstep(0.3, 0.4, snoise(pos * 3.0));

    // Veines de pollution
    float veins = abs(snoise(pos * 8.0));
    veins = smoothstep(0.7, 0.75, veins);

    // Couleurs toxiques
    vec3 toxicGreen = baseColor;
    vec3 acidYellow = vec3(0.8, 1.0, 0.2);
    vec3 poisonPurple = secondaryColor;
    vec3 darkSludge = baseColor * 0.2;

    vec3 surfaceColor = mix(darkSludge, toxicGreen, smoothstep(-0.2, 0.4, toxic));
    surfaceColor = mix(surfaceColor, acidYellow, acidPools * 0.6);
    surfaceColor = mix(surfaceColor, poisonPurple, veins);
    surfaceColor += vec3(bubbles * 0.5, bubbles * 0.8, bubbles * 0.2);

    // Emission toxique
    float emission = acidPools * 0.4 + bubbles * 0.3;

    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.2;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.6) + surfaceColor * emission * 0.5;

    // Rim verdâtre
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(0.4, 1.0, 0.3) * pow(rim, 3.0) * 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète cristalline
const crystalFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    // Formations cristallines
    float crystal1 = abs(snoise(pos * 6.0));
    float crystal2 = abs(snoise(pos * 12.0 + vec3(100.0)));
    float facets = step(0.7, crystal1) + step(0.8, crystal2) * 0.5;

    // Veines de cristal
    float veins = smoothstep(0.85, 0.9, abs(snoise(pos * 20.0)));

    // Reflets prismatiques
    float prism = snoise(pos * 4.0 + vec3(time * 0.1));
    vec3 prismColor = vec3(
      0.5 + 0.5 * sin(prism * 6.28 + 0.0),
      0.5 + 0.5 * sin(prism * 6.28 + 2.09),
      0.5 + 0.5 * sin(prism * 6.28 + 4.18)
    );

    // Couleurs cristallines
    vec3 crystalBase = baseColor;
    vec3 crystalDeep = secondaryColor * 0.6;
    vec3 crystalBright = vec3(1.0, 1.0, 1.0);

    vec3 surfaceColor = mix(crystalDeep, crystalBase, smoothstep(-0.3, 0.3, crystal1));
    surfaceColor = mix(surfaceColor, crystalBright, facets * 0.4);
    surfaceColor = mix(surfaceColor, prismColor, veins * 0.6);

    // Éclairage avec forte spécularité
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 128.0);

    // Sparkles
    float sparkle = pow(max(0.0, snoise(pos * 30.0)), 16.0);

    float ambient = 0.25;
    vec3 finalColor = surfaceColor * (ambient + diff * 0.75);
    finalColor += vec3(spec * 0.6);
    finalColor += crystalBright * sparkle * 0.8;

    // Rim arc-en-ciel
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += prismColor * pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour l'atmosphère
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    vec3 color = glowColor * fresnel * intensity;
    float alpha = fresnel * 0.7;

    gl_FragColor = vec4(color, alpha);
  }
`

// Shader pour les nuages (planètes gazeuses seulement)
const cloudsFragmentShader = `
  uniform vec3 cloudColor;
  uniform float time;
  uniform float seed;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = snoise(pos * 3.0 + vec3(time * 0.03, 0.0, 0.0));
    float n2 = snoise(pos * 6.0 - vec3(time * 0.02, 0.0, 0.0));

    float clouds = smoothstep(0.1, 0.6, n1 * 0.5 + n2 * 0.5);

    vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);

    vec3 color = cloudColor * (0.6 + diff * 0.4);
    float alpha = clouds * 0.5;

    gl_FragColor = vec4(color, alpha);
  }
`

// Shader pour anneaux
const ringFragmentShader = `
  uniform vec3 ringColor;
  uniform float innerRadius;
  uniform float outerRadius;
  uniform float seed;

  varying vec2 vUv;

  ${noiseGLSL}

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vUv - center) * 2.0;

    // Bandes dans les anneaux
    float bands = sin(dist * 50.0 + seed) * 0.5 + 0.5;
    float bands2 = sin(dist * 120.0 + seed * 2.0) * 0.5 + 0.5;

    // Gaps dans les anneaux (comme les divisions de Cassini)
    float gap1 = smoothstep(0.45, 0.47, dist) * (1.0 - smoothstep(0.48, 0.50, dist));
    float gap2 = smoothstep(0.65, 0.66, dist) * (1.0 - smoothstep(0.67, 0.68, dist));

    float alpha = bands * 0.6 + bands2 * 0.3;
    alpha *= (1.0 - gap1) * (1.0 - gap2 * 0.7);

    // Fade aux bords
    alpha *= smoothstep(0.0, 0.1, dist);
    alpha *= smoothstep(1.0, 0.85, dist);

    vec3 color = ringColor * (0.7 + bands * 0.3);

    gl_FragColor = vec4(color, alpha * 0.7);
  }
`

interface PlanetProps {
  campus: Campus
  onClick: () => void
  isActive: boolean
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
}

export function Planet({ campus, onClick, isActive, orbitRadius, orbitSpeed, orbitOffset }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Seed unique basé sur l'ID du campus
  const seed = useMemo(() => {
    let hash = 0
    for (let i = 0; i < campus.id.length; i++) {
      hash = ((hash << 5) - hash) + campus.id.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 1000
  }, [campus.id])

  // Détermine le type de planète avec plus de variété
  const planetType: PlanetType = useMemo(() => {
    const types: PlanetType[] = ['rocky', 'gasGiant', 'ice', 'lava', 'ocean', 'desert', 'toxic', 'crystal']
    return types[seed % types.length]
  }, [seed])

  // Variation de taille basée sur le seed
  const sizeVariation = useMemo(() => {
    const variation = ((seed * 7) % 100) / 100 // 0 à 1
    return 0.7 + variation * 0.6 // multiplicateur entre 0.7 et 1.3
  }, [seed])

  // Inclinaison de l'axe de rotation
  const axialTilt = useMemo(() => {
    return ((seed * 13) % 60) - 30 // entre -30 et 30 degrés
  }, [seed])

  // Vitesse de rotation variable
  const rotationSpeed = useMemo(() => {
    const baseSpeed = planetType === 'gasGiant' ? 0.004 : 0.002
    const variation = ((seed * 11) % 100) / 100
    return baseSpeed * (0.5 + variation) // variation de 50% à 150%
  }, [seed, planetType])

  const hasRings = useMemo(() => {
    // Plus de chances d'avoir des anneaux selon le type
    if (planetType === 'gasGiant') return true
    if (planetType === 'ice' || planetType === 'crystal') return seed % 3 === 0
    return seed % 7 === 0
  }, [planetType, seed])

  const hasClouds = useMemo(() => {
    return planetType === 'gasGiant' || planetType === 'ice' || planetType === 'ocean' || planetType === 'toxic'
  }, [planetType])

  // Intensité de l'atmosphère selon le type
  const atmosphereIntensity = useMemo(() => {
    switch (planetType) {
      case 'gasGiant': return 1.5
      case 'toxic': return 1.3
      case 'ocean': return 1.2
      case 'ice': return 1.1
      case 'lava': return 0.8
      case 'desert': return 0.6
      case 'rocky': return 0.7
      case 'crystal': return 1.4
      default: return 1.0
    }
  }, [planetType])

  // Couleurs de la planète avec variation selon le type
  const baseColor = useMemo(() => new THREE.Color(campus.color), [campus.color])
  const secondaryColor = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 }
    baseColor.getHSL(hsl)

    // Variation de la couleur secondaire selon le type
    let hueShift = 0.08
    let satMult = 0.9
    let lightMult = 0.75

    switch (planetType) {
      case 'gasGiant':
        hueShift = 0.05 + (seed % 10) / 100
        satMult = 0.8
        lightMult = 0.85
        break
      case 'ocean':
        hueShift = -0.05 // vers le cyan
        satMult = 1.1
        lightMult = 0.6
        break
      case 'desert':
        hueShift = 0.03 // vers l'orange
        satMult = 0.7
        lightMult = 0.5
        break
      case 'toxic':
        hueShift = 0.15 // vers le jaune-vert
        satMult = 1.2
        lightMult = 0.7
        break
      case 'crystal':
        hueShift = 0.2 // décalage arc-en-ciel
        satMult = 1.3
        lightMult = 0.9
        break
      case 'ice':
        hueShift = -0.02
        satMult = 0.6
        lightMult = 1.1
        break
      case 'lava':
        hueShift = -0.08 // vers le rouge
        satMult = 1.0
        lightMult = 0.4
        break
      default: // rocky
        hueShift = 0.1 + (seed % 5) / 50
        satMult = 0.85
        lightMult = 0.7
    }

    return new THREE.Color().setHSL(
      (hsl.h + hueShift + 1) % 1,
      Math.min(1, hsl.s * satMult),
      Math.min(1, hsl.l * lightMult)
    )
  }, [baseColor, planetType, seed])

  // Sélection du fragment shader selon le type
  const fragmentShader = useMemo(() => {
    switch (planetType) {
      case 'gasGiant': return gasGiantFragmentShader
      case 'ice': return iceFragmentShader
      case 'lava': return lavaFragmentShader
      case 'ocean': return oceanFragmentShader
      case 'desert': return desertFragmentShader
      case 'toxic': return toxicFragmentShader
      case 'crystal': return crystalFragmentShader
      default: return rockyFragmentShader
    }
  }, [planetType])

  // Uniforms pour les shaders
  const planetUniforms = useMemo(() => ({
    baseColor: { value: baseColor },
    secondaryColor: { value: secondaryColor },
    time: { value: 0 },
    seed: { value: seed },
    sunPosition: { value: new THREE.Vector3(0, 0, 0) }
  }), [baseColor, secondaryColor, seed])

  const atmosphereUniforms = useMemo(() => ({
    glowColor: { value: baseColor },
    intensity: { value: atmosphereIntensity }
  }), [baseColor, atmosphereIntensity])

  // Couleurs des nuages selon le type
  const cloudsUniforms = useMemo(() => {
    let cloudColor = new THREE.Color(1, 1, 1)

    switch (planetType) {
      case 'gasGiant':
        // Nuages légèrement teintés
        cloudColor = baseColor.clone().lerp(new THREE.Color(1, 1, 1), 0.7)
        break
      case 'ocean':
        // Nuages blancs purs
        cloudColor = new THREE.Color(0.95, 0.97, 1.0)
        break
      case 'toxic':
        // Nuages verdâtres/jaunâtres
        cloudColor = new THREE.Color(0.7, 0.9, 0.5)
        break
      case 'ice':
        // Nuages bleutés
        cloudColor = new THREE.Color(0.9, 0.95, 1.0)
        break
      default:
        cloudColor = new THREE.Color(1, 1, 1)
    }

    return {
      cloudColor: { value: cloudColor },
      time: { value: 0 },
      seed: { value: seed + 500 }
    }
  }, [seed, planetType, baseColor])

  // Couleur des anneaux selon le type de planète
  const ringUniforms = useMemo(() => {
    let ringColor = baseColor.clone()

    switch (planetType) {
      case 'gasGiant':
        // Anneaux dorés/beiges comme Saturne
        ringColor = baseColor.clone().lerp(new THREE.Color(0.9, 0.8, 0.6), 0.5)
        break
      case 'ice':
        // Anneaux bleutés glacés
        ringColor = baseColor.clone().lerp(new THREE.Color(0.8, 0.9, 1.0), 0.4)
        break
      case 'crystal':
        // Anneaux prismatiques
        ringColor = new THREE.Color().setHSL((seed % 100) / 100, 0.8, 0.7)
        break
      default:
        ringColor = baseColor.clone().lerp(new THREE.Color(0.7, 0.7, 0.7), 0.3)
    }

    return {
      ringColor: { value: ringColor },
      innerRadius: { value: 0.5 },
      outerRadius: { value: 1.0 },
      seed: { value: seed }
    }
  }, [baseColor, seed, planetType])

  // Position orbitale
  const currentPosition = useRef(new THREE.Vector3())

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Orbite autour du soleil
    if (groupRef.current) {
      const angle = time * orbitSpeed + orbitOffset
      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(angle * 0.5) * orbitRadius * 0.1 // Légère inclinaison

      groupRef.current.position.set(x, y, z)
      currentPosition.current.set(x, y, z)
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += rotationSpeed
      const material = planetRef.current.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.time.value = time
        material.uniforms.sunPosition.value.set(
          -currentPosition.current.x,
          -currentPosition.current.y,
          -currentPosition.current.z
        ).normalize().multiplyScalar(10)
      }
    }

    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.003
      const material = cloudsRef.current.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.time.value = time
      }
    }

    if (atmosphereRef.current) {
      const material = atmosphereRef.current.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.intensity.value = THREE.MathUtils.lerp(
          material.uniforms.intensity.value,
          hovered ? 1.8 : 1.0,
          0.1
        )
      }
    }
  })

  // Taille finale avec variation et bonus selon le type
  const planetSize = useMemo(() => {
    let size = campus.size * sizeVariation
    // Bonus de taille selon le type
    if (planetType === 'gasGiant') size *= 1.4
    else if (planetType === 'ocean') size *= 1.1
    else if (planetType === 'crystal') size *= 0.9
    else if (planetType === 'desert') size *= 1.05
    return size
  }, [campus.size, sizeVariation, planetType])

  return (
    <>
      {/* Orbite visible */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.03, orbitRadius + 0.03, 128]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={groupRef}>
        {/* Atmosphère externe (glow) */}
        <Sphere ref={atmosphereRef} args={[planetSize * 1.12, 64, 64]}>
          <shaderMaterial
            uniforms={atmosphereUniforms}
            vertexShader={atmosphereVertexShader}
            fragmentShader={atmosphereFragmentShader}
            transparent
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </Sphere>

        {/* Surface de la planète avec inclinaison axiale */}
        <group rotation={[axialTilt * Math.PI / 180, 0, 0]}>
          <Sphere
            ref={planetRef}
            args={[planetSize, 128, 128]}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHovered(true)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setHovered(false)
              document.body.style.cursor = 'auto'
            }}
          >
            <shaderMaterial
              uniforms={planetUniforms}
              vertexShader={planetVertexShader}
              fragmentShader={fragmentShader}
            />
          </Sphere>
        </group>

        {/* Couche de nuages (pour certains types) */}
        {hasClouds && (
          <Sphere ref={cloudsRef} args={[planetSize * 1.02, 64, 64]}>
            <shaderMaterial
              uniforms={cloudsUniforms}
              vertexShader={planetVertexShader}
              fragmentShader={cloudsFragmentShader}
              transparent
              depthWrite={false}
            />
          </Sphere>
        )}

        {/* Anneaux */}
        {hasRings && (
          <group rotation={[Math.PI * 0.4 + seed * 0.001, seed * 0.002, Math.PI * 0.05]}>
            <mesh>
              <ringGeometry args={[planetSize * 1.4, planetSize * 2.5, 128]} />
              <shaderMaterial
                uniforms={ringUniforms}
                vertexShader={`
                  varying vec2 vUv;
                  void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
                `}
                fragmentShader={ringFragmentShader}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        )}

        {/* Label */}
        {!isActive && (
          <Html
            position={[0, planetSize + 1.2, 0]}
            center
            style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: '400',
              letterSpacing: '0.08em',
              textShadow: `0 0 10px ${campus.color}, 0 0 20px rgba(255,255,255,0.5)`,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              opacity: hovered ? 1 : 0.7,
              transition: 'opacity 0.3s ease'
            }}
          >
            {campus.name}
          </Html>
        )}
      </group>
    </>
  )
}
