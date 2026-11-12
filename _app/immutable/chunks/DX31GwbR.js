import{DynamicDrawUsage as e,InstancedBufferAttribute as t,InstancedBufferGeometry as n,Mesh as r,PlaneGeometry as i,ShaderMaterial as a}from"./CeVBJVoU.js";var o={plain:0,page:1},s=1.5,c=30,l=`
  attribute vec4 aRect;
  attribute vec2 aDepth;
  attribute vec3 aColor;
  attribute vec3 aState;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying vec3 vColor;
  varying vec3 vState;
  void main() {
    vHalf = aRect.zw * .5;
    vLocal = position.xy * (aRect.zw + 2. * aDepth.y);
    vColor = aColor;
    vState = aState;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aRect.xy + vLocal, aDepth.x, 1.);
  }
`,u=`
  uniform vec3 uBackground;
  uniform float uTime;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying vec3 vColor;
  varying vec3 vState;

  /** How much of this pixel lies where the distance d is negative, given aa world px per pixel. */
  float covered(float d, float aa) {
    return clamp(.5 - d / aa, 0., 1.);
  }

  void main() {
    float fill = vState.x, glow = vState.y, style = vState.z;
    float aa = max(length(fwidth(vLocal)) * .7071, 1e-4);
    vec2 q = abs(vLocal) - vHalf;
    float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
    float body = covered(d, aa);
    float border = body - covered(d + 1., aa);

    // A lifted box casts a soft shadow, offset away from the light.
    vec2 s = abs(vLocal - vec2(3., -5.) * glow) - vHalf;
    float sigma = 3. + 9. * glow;
    float outside = length(max(s, 0.));
    float shadow = .55 * glow * exp(-outside * outside / (2. * sigma * sigma));

    vec2 uv = vLocal / (2. * vHalf) + .5;
    float amount = (.07 + .5 * fill + .25 * glow) * (.82 + .18 * uv.y);
    // Styles arrive as interpolated floats, which need not be exactly whole, so compare by range.
    if (.5 < style) {
      // The page shimmers, as everything inside it is the page again.
      amount += .1 * (.5 + .5 * sin(uTime * 1.7 - uv.x * 9.));
    }
    vec3 color = mix(uBackground, vColor, amount);
    color = mix(color, vColor * (1. + .35 * glow), border * (.45 + .55 * max(glow, fill)));

    // The box over its shadow, which is black.
    float alpha = body + (1. - body) * shadow;
    gl_FragColor = vec4(color * body / max(alpha, 1e-4), alpha);
  }
`,d=class{capacity;mesh;#e;#t;#n;#r;#i;#a;constructor(o,s){this.capacity=o;let c=new i(1,1);this.#e=new n,this.#e.index=c.index,this.#e.setAttribute(`position`,c.getAttribute(`position`));let d=n=>new t(new Float32Array(o*n),n).setUsage(e);this.#t=d(4),this.#n=d(2),this.#r=d(3),this.#i=d(3),this.#e.setAttribute(`aRect`,this.#t),this.#e.setAttribute(`aDepth`,this.#n),this.#e.setAttribute(`aColor`,this.#r),this.#e.setAttribute(`aState`,this.#i),this.#a=new a({uniforms:{uBackground:{value:s},uTime:{value:0}},vertexShader:l,fragmentShader:u,transparent:!0,depthTest:!1,depthWrite:!1}),this.mesh=new r(this.#e,this.#a),this.mesh.frustumCulled=!1}update(e,t){let n=Math.min(this.capacity,e.length);for(let t=0;t<n;t+=1){let n=e[t];this.#t.setXYZW(t,n.x,n.y,n.w,n.h),this.#n.setXY(t,n.z,s+c*n.glow),this.#r.setXYZ(t,...n.color),this.#i.setXYZ(t,n.fill,n.glow,o[n.style])}this.#e.instanceCount=n,this.#t.needsUpdate=this.#n.needsUpdate=this.#r.needsUpdate=this.#i.needsUpdate=!0,this.#a.uniforms.uTime.value=t}dispose(){this.#e.dispose(),this.#a.dispose()}};export{d as Slabs};