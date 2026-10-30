"""Build interface feedback from the user-selected, quieter Kenney click.
source-click.wav is option 2c at -4 dB. Preserve its timbre; vary only rhythm/gain.
"""
from pathlib import Path
import json
import struct
import wave

OUTPUT = Path(__file__).resolve().parents[1] / 'assets/sounds/clicks'
with wave.open(str(OUTPUT / 'source-click.wav')) as source:
    RATE = source.getframerate()
    raw = source.readframes(source.getnframes())
    click = struct.unpack('<' + 'h' * (len(raw) // 2), raw)
SOUNDS = {
    'open': [(0, 1)],
    'select': [(0, .88)],
    'navigate': [(0, .72), (.038, .42)],
    'expand': [(0, .9), (.028, .22)],
    'collapse': [(0, .78)],
    'copy': [(0, .7), (.055, .9)],
    'success': [(0, .75), (.065, 1)],
    'successAlt': [(0, .9), (.058, .75)],
    'wrong': [(0, .7)],
    'level': [(0, .6), (.055, .75), (.11, .9)],
}
for name, pulses in SOUNDS.items():
    length = round(max(start for start, _ in pulses) * RATE) + len(click)
    samples = [0] * length
    for start, gain in pulses:
        offset = round(start * RATE)
        for i, value in enumerate(click):
            samples[offset+i] += round(value * gain)
    with wave.open(str(OUTPUT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
(OUTPUT / 'sources.json').write_text(json.dumps({
    'author': 'Kenney',
    'source': 'https://kenney.nl/assets/interface-sounds',
    'original': 'click_003.ogg',
    'license': 'CC0-1.0',
    'selected': 'User-approved option 2c, quieter by 4 dB',
    'source_processing': '1.4x sinc resampling; gentle 1400 Hz low-shelf attenuation (0.38); matched transient energy within peak ceiling; final -4 dB gain.',
    'generator': 'scripts/generate-interface-clicks.py',
    'files': list(SOUNDS),
    'format': 'Mono 16-bit PCM WAV, 44100 Hz',
}, indent=2) + '\n')
