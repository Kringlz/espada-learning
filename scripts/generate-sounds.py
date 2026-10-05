"""Original quiet UI sounds: soft plucks, bubble and a short celebration."""
import math, struct, wave
from pathlib import Path
RATE = 22050
sounds = {
 'radar': [(0, 392, .28), (.11, 587.33, .28), (.22, 880, .32), (.34, 1174.66, .24)],
 'points': [(0, 783.99, .12), (.075, 1174.66, .17), (.16, 1567.98, .24)],
 'streak': [(0, 587.33, .18), (.12, 783.99, .2), (.24, 1174.66, .32), (.24, 1468.32, .32)],
 'open': [(0, 660, .09), (.05, 880, .11)],
 'success': [(0, 523.25, .18), (.09, 659.25, .19), (.18, 783.99, .2), (.29, 1046.5, .25)],
 'level': [(0, 523.25, .16), (.10, 659.25, .16), (.20, 783.99, .16), (.32, 1046.5, .4), (.32, 1318.5, .4)],
}
for name, notes in sounds.items():
 duration=max(start+length for start,_,length in notes)+.03
 values=[]
 for i in range(int(duration*RATE)):
  t=i/RATE; sample=0
  for start,freq,length in notes:
   dt=t-start
   if 0<=dt<length:
    envelope=min(1,dt/.008)*(1-dt/length)**2
    sample+=.18*envelope*(math.sin(2*math.pi*freq*dt)+.15*math.sin(4*math.pi*freq*dt))
  values.append(struct.pack('<h',int(max(-1,min(1,sample))*32767)))
 with wave.open(str(Path('assets/sounds')/(name+'.wav')),'wb') as f:
  f.setparams((1,2,RATE,0,'NONE','not compressed'));f.writeframes(b''.join(values))
