"""Render the original design-lab/clarity-audio.js sine envelopes to portable PCM.
No external samples. Same 75 BPM pentatonic phrase, gains and note lengths.
"""
import math, wave, struct
from pathlib import Path
RATE = 22050
ROOT = Path(__file__).resolve().parents[1] / 'assets/sounds/clarity'
ROOT.mkdir(parents=True, exist_ok=True)
def render(name, seconds, notes):
    samples = [0.] * round(seconds * RATE)
    for frequency, start, length, gain in notes:
        for i in range(round(length * RATE)):
            pos = round(start * RATE) + i
            if pos >= len(samples): break
            t = i / RATE
            envelope = gain * t / .025 if t < .025 else gain * (.0001 / gain) ** ((t - .025) / (length - .025))
            samples[pos] += math.sin(2 * math.pi * frequency * t) * envelope
    assert max(map(abs, samples)) < 1
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes(b''.join(struct.pack('<h', round(v * 32767)) for v in samples))
melody = [523.25,0,659.25,587.33,0,440,0,392,440,0,587.33,659.25,0,523.25,0,0]
notes = [(f,i*.8,1.6,.10) for i,f in enumerate(melody) if f]
for beat, root in [(0,130.81),(8,110)]: notes += [(root,beat*.8,5.8,.055),(root*1.5,beat*.8,5.8,.03)]
render('music',12.8,notes)
render('open',.15,[(587.33,0,.1,.09)])
render('success',.70,[(f,i*.1,.45,.12) for i,f in enumerate([523.25,659.25,783.99])])
render('wrong',.60,[(392,0,.3,.1),(349.23,.14,.4,.08)])
render('level',1.1,[(f,i*.13,.55,.12) for i,f in enumerate([523.25,659.25,783.99,1046.5])])
