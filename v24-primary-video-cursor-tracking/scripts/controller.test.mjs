import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { normalize, smooth, selectPhoto, targetPose, validateAtlas } from '../src/controller.ts';
const base = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, base), 'utf8'));
const atlas = read('data/selected-image-manifest.json');
const primary = read('data/primary/frame-manifest.json');
const inventory = read('data/inventory.json');
const neutral = atlas.frames.find(p => p.id === atlas.neutral);

test('native primary extraction is complete, chronological and timestamp preserving', () => {
  const v = inventory.find(v => v.id === 'primary');
  assert.equal(v.frame_count, 240); assert.equal(v.extracted_count, 240);
  assert.equal(readdirSync(new URL('data/primary/original-jpg/', base)).length, 240);
  for (let i = 0; i < 240; i++) {
    assert.equal(primary[i].frame, i); assert.equal(primary[i].timestamp, v.timestamps[i]);
    assert.ok(existsSync(new URL(primary[i].image, base)));
    assert.ok(primary[i].visual_review.startsWith('reviewed'));
    for (const key of ['yaw','pitch','roll','blink','sharpness']) assert.ok(Number.isFinite(primary[i][key]));
    assert.equal(primary[i].gaze_proxy.length, 4); assert.ok(primary[i].appearance_review.collar_shoulders);
    if (i) assert.ok(v.timestamps[i] > v.timestamps[i-1]);
  }
});
test('source inventory distinguishes original candidates from derived previews', () => {
  assert.equal(inventory.length, 19); assert.equal(inventory.reduce((n, v) => n+v.frame_count, 0), 4559);
  assert.ok(inventory.every(v => v.sha256.length === 64 && v.width === 1920 && v.height === 1080));
  assert.ok(read('data/excluded-videos.json').some(v => v.filename === 'v20_living_portrait_v2.mp4'));
});
test('runtime provenance and all optimized photographs resolve', () => {
  validateAtlas(atlas); assert.equal(atlas.frames.length, 197);
  for (const photo of atlas.frames) {
    assert.equal(photo.filename, atlas.primary); assert.equal(photo.source, 'primary');
    for (const path of [photo.url, photo.sharp_url]) assert.ok(existsSync(new URL(`public${path}`, base)));
    assert.ok(![12,199,200,201].includes(photo.frame));
  }
  assert.equal(atlas.approved_repairs.length, 0);
  assert.equal(read('data/secondary-compatibility.json').length, 54);
});
test('normalization rejects invalid extents and clamps viewport boundaries', () => {
  assert.equal(normalize(0, 100), -1); assert.equal(normalize(50,100), 0); assert.equal(normalize(150,100),1);
  assert.equal(normalize(NaN,100),0); assert.equal(normalize(10,0),0);
});
test('coordinate smoothing is frame-rate independent at 20, 35 and 50ms', () => {
  for (const tau of [20,35,50]) {
    let a=0,b=0; for(let i=0;i<10;i++) a=smooth(a,1,10,tau); for(let i=0;i<20;i++) b=smooth(b,1,5,tau);
    assert.ok(Math.abs(a-b)<1e-10);
    assert.equal(smooth(1,-1,16,0),-1);
    const reversed=smooth(.8,-1,16,tau); assert.ok(reversed<.8, 'reversal immediately changes motion toward the latest target');
  }
});
for (const [name, a] of Object.entries(atlas.anchors)) test(`direction ${name} selects a truthful photographic orientation`, () => {
  const s = selectPhoto(atlas, neutral, ...a.input, 'nearest');
  assert.ok(s.supported, name); assert.ok(s.error <= atlas.selection.max_pose_error);
  const y = s.photo.yaw-atlas.calibration.yaw0, p=s.photo.pitch-atlas.calibration.pitch0;
  if (name.includes('LEFT')) assert.ok(y<0); if(name.includes('RIGHT')) assert.ok(y>0);
  if(name.includes('UP')) assert.ok(p>0); if(name.includes('DOWN')||name.includes('LOWER')) assert.ok(p<0);
  assert.equal(s.photo.filename,atlas.primary);
});
test('unsupported upper interior holds a stable pose without a detour or invented image', () => {
  const s=selectPhoto(atlas,neutral,0,-.40);
  assert.equal(s.supported,false); assert.equal(s.photo.id,neutral.id); assert.match(s.reason,/Missing intermediate/);
});
test('stationary selection does not chatter', () => {
  for (const a of Object.values(atlas.anchors)) {
    let current=neutral; let lateChanges=0;
    for(let i=0;i<120;i++) { const s=selectPhoto(atlas,current,...a.input);if(i>20&&s.photo.id!==current.id)lateChanges++;current=s.photo; }
    assert.equal(lateChanges,0);
  }
});
test('two-axis targets and shallow downward range are explicit', () => {
  assert.ok(targetPose(atlas,1,-1).yaw>targetPose(atlas,-1,-1).yaw);
  assert.equal(targetPose(atlas,0,1).pitch,atlas.calibration.pitch0-5);
  assert.equal(targetPose(atlas,0,-1).pitch,atlas.calibration.pitch0+18);
});
test('circular trajectories disclose unsampled regions rather than asserting complete coverage', () => {
  const summary=[];
  for (const radius of [.15,.4,.7,.95]) {
    let current=neutral, unsupported=0, changes=0;
    for(let i=0;i<360;i++) { const a=i/360*Math.PI*2;const s=selectPhoto(atlas,current,Math.cos(a)*radius,Math.sin(a)*radius);if(!s.supported)unsupported++;if(current.id!==s.photo.id)changes++;assert.ok(atlas.frames.some(p=>p.id===s.photo.id));current=s.photo; }
    summary.push({radius,unsupported,changes});
  }
  assert.ok(summary.some(s=>s.unsupported>0));
});
test('B and C are identical when no secondary replacement passed', () => {
  for(const a of Object.values(atlas.anchors)) assert.equal(selectPhoto(atlas,neutral,...a.input,'continuity','B').photo.id,selectPhoto(atlas,neutral,...a.input,'continuity','C').photo.id);
});
test('manifest validation rejects broken image paths and neighbor links', () => {
  const bad=structuredClone(atlas);bad.frames[0].neighbors=[99999];assert.throws(()=>validateAtlas(bad));
  const badPath=structuredClone(atlas);badPath.frames[0].url='/unrelated.mp4';assert.throws(()=>validateAtlas(badPath));
});
