export type Method = 'static' | 'a' | 'b';
type Timer={TIME_ELAPSED_EXT:number;QUERY_RESULT_AVAILABLE_EXT:number;QUERY_RESULT_EXT:number;GPU_DISJOINT_EXT:number;createQueryEXT:()=>unknown;beginQueryEXT:(target:number,q:unknown)=>void;endQueryEXT:(target:number)=>void;getQueryObjectEXT:(q:unknown,p:number)=>number|boolean;deleteQueryEXT:(q:unknown)=>void};
const vertex = `
attribute vec2 point;
uniform vec2 pose;
uniform float method;
varying vec2 uv;
void main(){
 uv=point/vec2(1672.,941.);
 vec2 p=point;
 float anchor=1.-smoothstep(570.,655.,point.y);
 if(method>0.5){
  if(method<1.5){
   p+=vec2(pose.x*120.,-pose.y*100.)*anchor;
  }else{
   vec2 d=point-vec2(820.,660.);
   vec2 e=(point-vec2(820.,350.))/vec2(190.,255.);
   float dome=sqrt(max(0.,1.-dot(e,e)));
   float plateau=1.-smoothstep(.42,.8,length(e));
   float z=mix(30.+100.*dome,130.,plateau);
   // Orthographic micro-rotation; no invented back-facing texture.
   float x=d.x*cos(pose.x)+z*sin(pose.x);
   float depth=-d.x*sin(pose.x)+z*cos(pose.x);
   float y=d.y*cos(pose.y)-depth*sin(pose.y);
   p+=vec2(x-d.x,y-d.y)*anchor;
  }
 }
 gl_Position=vec4(p.x/1672.*2.-1.,1.-p.y/941.*2.,0.,1.);
}`;
const fragment = `
precision highp float;
uniform sampler2D photograph;
uniform sampler2D matte;
uniform float masked;
varying vec2 uv;
void main(){ vec4 c=texture2D(photograph,uv); float a=mix(1.,texture2D(matte,uv).r,masked); gl_FragColor=vec4(c.rgb,a); }
`;
export class Renderer {
 gl: WebGLRenderingContext;
 program: WebGLProgram;
 textures: WebGLTexture[]=[];
 count=0;
 bytes=0;
 loadMs=0;
 drawMs: number[]=[];
 gpuMs: number[]=[];
 timer:Timer|null=null;
 pending:unknown[]=[];
 drawCount=0;
 constructor(public canvas: HTMLCanvasElement){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl) throw Error('WebGL unavailable. Use the static photograph.');
  this.gl=gl;
  this.timer=gl.getExtension('EXT_disjoint_timer_query') as Timer|null;
  const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader error');return s;};
  const program=gl.createProgram()!;gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Link error');
  this.program=program; gl.useProgram(program);
  const verts:number[]=[]; const cols=84,rows=48;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const x0=x/cols*1672,x1=(x+1)/cols*1672,y0=y/rows*941,y1=(y+1)/rows*941;
   verts.push(x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1);
  }
  this.count=verts.length/2;this.bytes=verts.length*4;
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  gl.uniform1i(gl.getUniformLocation(program,'photograph'),0);gl.uniform1i(gl.getUniformLocation(program,'matte'),1);
  gl.clearColor(.65,.65,.65,1);
 }
 async load(){
  const start=performance.now();
  for(const url of ['/original.png','/static-plate.png','/head-mask.png']){
   const image=new Image();image.src=url;await image.decode();
   const gl=this.gl,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);this.textures.push(t);
  }
  this.loadMs=performance.now()-start;
 }
 draw(method:Method,x:number,y:number){
  const start=performance.now(),gl=this.gl;
  const timer=this.timer;
  if(timer){this.pending=this.pending.filter(q=>{if(!timer.getQueryObjectEXT(q,timer.QUERY_RESULT_AVAILABLE_EXT))return true;if(!gl.getParameter(timer.GPU_DISJOINT_EXT))this.gpuMs.push(Number(timer.getQueryObjectEXT(q,timer.QUERY_RESULT_EXT))/1e6);timer.deleteQueryEXT(q);return false;});}
  const q=timer&&this.drawCount++%20===0&&this.pending.length<5?timer.createQueryEXT():null;
  if(q)timer!.beginQueryEXT(timer!.TIME_ELAPSED_EXT,q);
  const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);
  const w=Math.min(1672*2,Math.round(r.width*dpr)),h=Math.min(941*2,Math.round(r.height*dpr));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  gl.viewport(0,0,w,h);gl.useProgram(this.program);
  const uniform=(name:string,value:number)=>gl.uniform1f(gl.getUniformLocation(this.program,name),value);
  const layer=(texture:WebGLTexture,masked:number,mode:number)=>{
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textures[2]);
   uniform('masked',masked);uniform('method',mode);gl.drawArrays(gl.TRIANGLES,0,this.count);
  };
  gl.uniform2f(gl.getUniformLocation(this.program,'pose'),x*Math.PI/180,y*Math.PI/180);
  gl.disable(gl.BLEND);
  if(method==='static'||Math.abs(x)+Math.abs(y)<.00001){layer(this.textures[0],0,0);}
  else {layer(this.textures[1],0,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);layer(this.textures[0],1,method==='a'?1:2);}
  if(q){timer!.endQueryEXT(timer!.TIME_ELAPSED_EXT);this.pending.push(q);}
  this.drawMs.push(performance.now()-start);if(this.drawMs.length>10000)this.drawMs.shift();
 }
 metrics(){const gl=this.gl;return {loadMs:this.loadMs,textureMiB:1672*941*4*3/1048576,nominalDecodedImageMiB:1672*941*4*3/1048576,extraDOMImagePossibleMiB:1672*941*4/1048576,meshKiB:this.bytes/1024,framebufferMiB:this.canvas.width*this.canvas.height*4/1048576,drawMs:this.drawMs,textureSize:[1672,941],drawingBuffer:[this.canvas.width,this.canvas.height],maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),gpuTimerAvailable:!!this.timer,gpuTimeMs:this.gpuMs,gpuMemoryMeasured:false};}
 destroy(){for(const t of this.textures)this.gl.deleteTexture(t);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
