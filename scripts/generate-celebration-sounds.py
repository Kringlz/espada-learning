"""Original Espada reward sounds: a soft air pop and two short, warm plucks.
No external samples or Python dependencies. Reproduce the checked-in PCM assets.
"""
from pathlib import Path
import json
import math
import random
import struct
import wave

RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / 'assets/sounds/celebration'
OUTPUT.mkdir(parents=True, exist_ok=True)

for name, root, seed in [('success', 523.25, 73), ('successAlt', 587.33, 91)]:
    randomizer = random.Random(seed)
    length = 0.36
    samples = []
    air = 0.0
    for i in range(round(length * RATE)):
        t = i / RATE
        air += 0.13 * (randomizer.uniform(-1, 1) - air)
        # A rounded launch transient, without a sharp click or rising electronic beep.
        attack = 1 - math.exp(-t / 0.003)
        value = 0.30 * air * attack * math.exp(-t / 0.032)
        value += 0.18 * math.sin(2 * math.pi * 180 * t) * attack * math.exp(-t / 0.024)
        for start, frequency, gain in [(0.012, root, 0.30), (0.065, root * 1.5, 0.21)]:
            age = t - start
            if age < 0:
                continue
            envelope = (1 - math.exp(-age / 0.004)) * math.exp(-age / 0.060)
            tone = math.sin(2 * math.pi * frequency * age)
            tone += 0.12 * math.sin(2 * math.pi * frequency * 2 * age) * math.exp(-age / 0.028)
            value += gain * envelope * tone
        samples.append(value * min(1, (length - t) / 0.025))
    peak = max(map(abs, samples))
    with wave.open(str(OUTPUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', round(value / peak * 0.62 * 32767)) for value in samples))

(OUTPUT / 'sources.json').write_text(json.dumps({
    'description': 'Original procedural audio created for Espada. No third-party samples.',
    'generator': 'scripts/generate-celebration-sounds.py',
    'files': ['success.wav', 'successAlt.wav'],
    'format': 'Mono 16-bit PCM WAV, 44100 Hz, 360 ms',
}, indent=2) + '\n')
