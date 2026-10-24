"""Reproduce Espada's original, unpitched interface clicks using filtered noise.
No samples, oscillators, musical notes, or external dependencies.
"""
from pathlib import Path
import json
import math
import random
import struct
import wave

RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / 'assets/sounds/clicks'
# (start seconds, decay seconds, low-pass cutoff Hz, relative strength)
SOUNDS = {
    'open': [(0, .006, 1800, 1)],
    'select': [(0, .004, 2200, .88)],
    'navigate': [(0, .007, 1400, 1)],
    'expand': [(0, .006, 1700, 1), (.028, .003, 2100, .25)],
    'collapse': [(0, .005, 1200, .9)],
    'copy': [(0, .005, 1900, .8), (.055, .004, 2300, 1)],
    'success': [(0, .007, 1300, .85), (.065, .005, 2000, 1)],
    'successAlt': [(0, .006, 1500, 1), (.058, .004, 2400, .8)],
    'wrong': [(0, .009, 850, .8)],
    'level': [(0, .007, 1300, .7), (.055, .005, 1800, .85), (.11, .004, 2200, 1)],
}
OUTPUT.mkdir(parents=True, exist_ok=True)
for seed, (name, pulses) in enumerate(SOUNDS.items(), 101):
    length = max(start + decay * 8 for start, decay, _, _ in pulses)
    samples = [0.0] * math.ceil(length * RATE)
    rng = random.Random(seed)
    for start, decay, cutoff, strength in pulses:
        alpha = 1 - math.exp(-2 * math.pi * cutoff / RATE)
        low = body = 0.0
        for i in range(math.ceil(decay * 8 * RATE)):
            t = i / RATE
            noise = rng.uniform(-1, 1)
            low += alpha * (noise - low)
            body += .035 * (low - body)
            # Sub-millisecond attack, a dry tactile transient, then a rapid decay.
            envelope = (1 - math.exp(-t / .00035)) * math.exp(-t / decay)
            index = round(start * RATE) + i
            if index < len(samples):
                samples[index] += (low * .82 + body * .18) * envelope * strength
    peak = max(map(abs, samples))
    with wave.open(str(OUTPUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', round(value / peak * .58 * 32767)) for value in samples))
(OUTPUT / 'sources.json').write_text(json.dumps({
    'description': 'Original procedural filtered-noise clicks created for Espada. No third-party samples or pitched oscillators.',
    'generator': 'scripts/generate-interface-clicks.py',
    'files': list(SOUNDS),
    'format': 'Mono 16-bit PCM WAV, 44100 Hz; single clicks 32–72 ms, short confirmation sequences 87–142 ms.',
}, indent=2) + '\n')
