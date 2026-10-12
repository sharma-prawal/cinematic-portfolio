"""Assemble actual browser captures; never source-video facial interpolation."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

out = Path('qa/interaction-polish')
report = json.loads((out / 'results.json').read_text())
width = 1440
runs = [next(r for r in report['runs'] if r['width'] == width and r['config'] == config)
        for config in ['baseline', 'boundary']]


def command(*args):
    subprocess.run(['rtk', 'proxy', 'ffmpeg', '-y', '-v', 'error', '-threads', '1', *args], check=True)


for run in runs:
    video = out / f"{run['config']}-{width}.webm"
    raw = Path('/private/tmp') / f"polish-marker-{run['config']}-{width}.raw"
    command('-i', str(video), '-vf', 'crop=4:4:0:ih-8,scale=1:1', '-r', '25',
            '-pix_fmt', 'rgb24', '-f', 'rawvideo', str(raw))
    pixels = raw.read_bytes()
    marker = next(i // 3 for i in range(0, len(pixels), 3)
                  if pixels[i] < 70 and pixels[i + 1] > 180 and pixels[i + 2] < 70)
    run['markerVideoSeconds'] = marker / 25


def start(run, phase):
    phase_time = next(p['t'] for p in run['phases'] if p['name'] == phase)
    return run['markerVideoSeconds'] + (phase_time - run['phases'][0]['t']) / 1000


clips = [('route-slow', 'slow-center-down', 'setup-normal-center-down'),
         ('route-normal', 'normal-center-down', 'setup-rapid-center-down'),
         ('route-rapid', 'rapid-center-down', 'setup-boundary-x65'),
         ('boundary-x65', 'boundary-x65', 'setup-boundary-x65-reverse'),
         ('boundary-y65', 'boundary-y65', 'setup-boundary-y65-reverse'),
         ('right-radial', 'right-radial-x65', 'setup-right-radial-x65-reverse'),
         ('midpoint-reversals', 'rapid-midpoint-reversals', 'setup-boundary-jitter'),
         ('center-diagonal', 'slow-diagonal', 'setup-slow-diagonal-reverse')]

sync = {'viewport': [1440, 900], 'captureFPS': 25,
        'note': 'Aligned to the green start marker and recorded phase timestamps. Capture alignment is approximately one video frame (40 ms); unaltered originals and 60 Hz Canvas draw traces are retained.',
        'markers': {r['config']: r['markerVideoSeconds'] for r in runs}, 'clips': []}
for name, phase, end_phase in clips:
    offsets = [start(r, phase) for r in runs]
    duration = min(start(r, end_phase) - start(r, phase) for r in runs)
    destination = out / f'comparison-{name}.webm'
    command('-ss', str(offsets[0]), '-i', str(out / f'baseline-{width}.webm'),
            '-ss', str(offsets[1]), '-i', str(out / f'boundary-{width}.webm'),
            '-filter_complex', '[0:v]scale=960:600,setsar=1,setpts=PTS-STARTPTS[a];[1:v]scale=960:600,setsar=1,setpts=PTS-STARTPTS[b];[a][b]hstack=inputs=2[v]',
            '-map', '[v]', '-t', str(duration), '-an', '-c:v', 'libvpx-vp9',
            '-threads', '1', '-crf', '30', '-b:v', '0', str(destination))
    sync['clips'].append({'file': destination.name, 'phase': phase, 'offsetsSeconds': offsets, 'durationSeconds': duration})
    deltas = [.1, duration / 2, max(.1, duration - .1)]
    board = Image.new('RGB', (1920, 1890), 'white')
    for row, delta in enumerate(deltas):
        frame = Path('/private/tmp') / f'polish-evidence-{name}-{row}.png'
        command('-ss', str(delta), '-i', str(destination), '-frames:v', '1', str(frame))
        image = Image.open(frame)
        board.paste(image, (0, row * 630))
        ImageDraw.Draw(board).text((10, row * 630 + 608),
                                  f'Actual browser recording: baseline LEFT / tuned 65 ms RIGHT; {phase} +{delta:.2f}s', fill='black')
    board.save(out / f'comparison-{name}.jpg', quality=95)
    print(destination, flush=True)

(out / 'video-sync.json').write_text(json.dumps(sync, indent=2) + '\n')
