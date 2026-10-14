const inventory = await fetch('data/inventory.json').then(r => r.json());
const video = document.querySelector('#source');
const select = document.querySelector('#sources');
const status = document.querySelector('#status');
for (const source of inventory) {
  const option = document.createElement('option');
  option.value = source.id;
  option.textContent = `${source.id} · ${source.filename}`;
  select.append(option);
}
function load(id) {
  const source = inventory.find(s => s.id === id);
  select.value = id;
  video.src = `../${encodeURIComponent(source.filename)}`;
  status.textContent = `${source.id} · ${source.filename} · original photographic footage`;
}
select.addEventListener('change', () => load(select.value));
document.querySelector('#slow').addEventListener('click', () => {
  video.playbackRate = video.playbackRate === 1 ? .5 : 1;
});
video.addEventListener('timeupdate', () => {
  const source = inventory.find(s => s.id === select.value);
  status.textContent = `${source.id} · original frame ≈${Math.floor(video.currentTime * 24)} · ${video.currentTime.toFixed(3)}s · ${video.playbackRate}×`;
});
window.audit = {inventory, load};
load(inventory[0].id);
