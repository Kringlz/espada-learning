"""Build reflowable, selectable lesson blocks from the original local PDFs.
Geometry is retained as small diagram crops. Every other glyph becomes text;
PDF baselines preserve true superscript/subscript runs. No OCR or external calls.
Run after import-math-course.py, or directly against committed grade PDFs.
"""
from pathlib import Path
from collections import Counter
import json, re
import pdfplumber
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'content/math-course'
FIGURES = DEST / 'figures'
FIGURES.mkdir(exist_ok=True)
catalog = json.loads((DEST/'catalog.json').read_text())
assets, result, audit = {}, {}, []

def lines_of(chars):
    lines = []
    for c in sorted(chars, key=lambda c:(c['top'],c['x0'])):
        center=(c['top']+c['bottom'])/2
        candidates=[l for l in lines if min(l['bottom'],c['bottom'])-max(l['top'],c['top']) > min(l['bottom']-l['top'],c['height'])*.22 and abs(center-l['center']) < max(l['size'],c['size'])*.65]
        if candidates:
            line=min(candidates,key=lambda l:abs(l['center']-center))
            line['chars'].append(c)
            line['top']=min(line['top'],c['top']); line['bottom']=max(line['bottom'],c['bottom'])
            line['size']=max(line['size'],c['size']);line['center']=(line['top']+line['bottom'])/2
        else: lines.append({'chars':[c],'top':c['top'],'bottom':c['bottom'],'size':c['size'],'center':center})
    return sorted(lines,key=lambda l:l['top'])

def runs_of(chars):
    chars=sorted(chars,key=lambda c:c['x0'])
    biggest=max(c['size'] for c in chars)
    baseline=Counter(round(c['bottom'] - .293*c['size'],1) for c in chars if c['size'] >= biggest*.95).most_common(1)[0][0]
    runs=[]
    prev=None
    for c in chars:
        shift=baseline-(c['bottom']-.293*c['size'])
        script='sup' if shift > 2 else 'sub' if shift < -2 else None
        style={}
        if script:style['script']=script
        if 'Bold' in c['fontname']:style['bold']=True
        if 'Italic' in c['fontname']:style['italic']=True
        text=c['text']
        if prev and c['x0']-prev['x1']>max(1.8, c['size']*.2) and not text.startswith(' ') and not runs[-1]['text'].endswith(' '):
            # A change to a superscript directly next to its base is not a word boundary.
            if not script or c['x0']-prev['x1']>6: text=' '+text
        if runs and {k:v for k,v in runs[-1].items() if k!='text'}==style:runs[-1]['text']+=text
        else:runs.append({'text':text,**style})
        prev=c
    if runs:runs[0]['text']=runs[0]['text'].lstrip();runs[-1]['text']=runs[-1]['text'].rstrip()
    return [r for r in runs if r['text']]

def flat(runs):return ''.join(r['text'] for r in runs)

def append_runs(a,b):
    if a and b:a.append({'text':' '})
    a.extend(b)

def inside(c,box):
    x=(c['x0']+c['x1'])/2;y=(c['top']+c['bottom'])/2
    return box[0] <= x <= box[2] and box[1] <= y <= box[3]

def get_figures(page,chars, fraction_bars=()):
    # Full-width horizontal rules belong to tables/footer. Rounded filled panels
    # are callouts, not drawings. Actual diagrams have strokes, ticks or dots.
    shapes=[]
    for o in page.lines+page.curves+page.rects:
        if o in fraction_bars: continue
        if o['top']<85 or o['bottom']>790:continue
        w=o['x1']-o['x0']; h=o['bottom']-o['top']
        if o['object_type']=='line' and h<.5 and w>495:continue
        if o['object_type']!='line' and not o.get('stroke') and (w>30 or h>30):continue
        if o['object_type']=='rect' and w>490:continue
        shapes.append(o)
    groups=[]
    for o in sorted(shapes,key=lambda o:o['top']):
        overlaps=[g for g in groups if o['top'] <= g[3]+24 and o['bottom']>=g[1]-24]
        if overlaps:
            g=overlaps[0];g[0]=min(g[0],o['x0']);g[1]=min(g[1],o['top']);g[2]=max(g[2],o['x1']);g[3]=max(g[3],o['bottom']);g[4]+=1
            for other in overlaps[1:]:g[0]=min(g[0],other[0]);g[1]=min(g[1],other[1]);g[2]=max(g[2],other[2]);g[3]=max(g[3],other[3]);g[4]+=other[4];groups.remove(other)
        else:groups.append([o['x0'],o['top'],o['x1'],o['bottom'],1])
    boxes=[]
    for g in groups:
        if g[2]-g[0]<20 or (g[4]<2 and g[3]-g[1]<15):continue
        # Diagram labels stay with their geometry; prose captions remain selectable.
        box=[max(30,g[0]-20),g[1]-14,min(page.width-30,g[2]+24),g[3]+17]
        for line in lines_of(chars):
            s=''.join(c['text'] for c in sorted(line['chars'],key=lambda c:c['x0']))
            if line['bottom'] >= box[1] and line['top'] <= box[3] and len(re.findall('[А-Яа-яёЁ]',s))<8:
                box[0]=min(box[0],min(c['x0'] for c in line['chars'])-5)
                box[1]=min(box[1],line['top']-4)
                box[2]=max(box[2],max(c['x1'] for c in line['chars'])+5)
                box[3]=max(box[3],line['bottom']+4)
        # Do not cut through prose alongside or below a diagram.
        for line in lines_of(chars):
            text=flat(runs_of(line['chars']))
            if len(re.findall('[А-Яа-яёЁ]',text)) >= 8:
                if min(c['x0'] for c in line['chars']) > g[2] and line['top'] <= box[3] and line['bottom'] >= box[1]:box[2]=min(box[2],min(c['x0'] for c in line['chars'])-4)
                if line['top'] > g[3] and line['top'] < box[3]:box[3]=line['top']-3
                if line['bottom'] < g[1] and line['bottom'] > box[1]:box[1]=line['bottom']+3
        boxes.append(box)
    return boxes

def get_tables(page,chars,figures):
    tables=[]
    for r in page.rects:
        if not (r['x0']>30 and r['x1']>540 and 15<r['height']<80 and 100<r['top']<780):continue
        if any(r['top']>=b[1] and r['bottom']<=b[3] for b in figures):continue
        boundaries=[r['top'],r['bottom']]
        for l in sorted(page.lines,key=lambda l:l['top']):
            if abs(l['x0']-r['x0'])>1 or abs(l['x1']-r['x1'])>1 or abs(l['height'])>.5:continue
            if l['top']>boundaries[-1]+1 and l['top']-boundaries[-1]<85 and l['top']<790:boundaries.append(l['top'])
        header=sorted([c for c in chars if r['top']<=c['top']<r['bottom']],key=lambda c:c['x0'])
        if not header or len(boundaries)<3:continue
        starts=[header[0]['x0']]
        for a,b in zip(header,header[1:]):
            if b['x0']-a['x1']>14:starts.append(b['x0'])
        if len(starts)<2:continue
        edges=[r['x0']]+[x-5 for x in starts[1:]]+[r['x1']]
        rows=[]
        for top,bottom in zip(boundaries,boundaries[1:]):
            cells=[]
            for left,right in zip(edges,edges[1:]):
                cell=[]
                for line in lines_of([c for c in chars if inside(c,[left,top,right,bottom])]):append_runs(cell,runs_of(line['chars']))
                cells.append(cell)
            rows.append(cells)
        tables.append({'box':[r['x0'],boundaries[0],r['x1'],boundaries[-1]],'kind':'table','rows':rows})
    return tables

def get_equations(page, chars):
    fractions=[]
    for bar in page.lines:
        if bar['height'] > .5 or not 8 < bar['width'] < 450: continue
        near=[c for c in chars if c['size']>=14 and bar['x0']-1 <= (c['x0']+c['x1'])/2 <= bar['x1']+1]
        above=[c for c in near if bar['top']-30 < (c['top']+c['bottom'])/2 < bar['top']-2]
        below=[c for c in near if bar['top']+2 < (c['top']+c['bottom'])/2 < bar['top']+32]
        if above and below and not re.search('[А-Яа-я]', ''.join(c['text'] for c in above+below)):
            fractions.append({'bar':bar,'above':above,'below':below})
    groups=[]
    for f in fractions:
        group=next((g for g in groups if abs(g[0]['bar']['top']-f['bar']['top'])<2),None)
        if group is None:groups.append([f])
        else:group.append(f)
    items=[];taken=set()
    for group in groups:
        group.sort(key=lambda f:f['bar']['x0'])
        own=[c for f in group for c in f['above']+f['below']]
        top=min(c['top'] for c in own);bottom=max(c['bottom'] for c in own)
        others=[c for c in chars if c['size']>=14 and top <= (c['top']+c['bottom'])/2 <= bottom and c not in own]
        parts=[]
        for f in group:
            before=[c for c in others if c['x1']<=f['bar']['x0']]
            if before:parts.append({'kind':'text','runs':runs_of(before)});others=[c for c in others if c not in before]
            parts.append({'kind':'fraction','numerator':runs_of(f['above']),'denominator':runs_of(f['below'])})
        if others:parts.append({'kind':'text','runs':runs_of(others)})
        taken.update(c['gid'] for c in own)
        taken.update(c['gid'] for c in chars if c['size']>=14 and top <= (c['top']+c['bottom'])/2 <= bottom)
        items.append({'y':top,'kind':'equation','parts':parts})
    return items,taken,[f['bar'] for f in fractions]

def get_calculations(page, chars):
    panels=sorted([o for o in page.curves if o.get('fill') and not o.get('stroke') and o['width']>450 and o['height']>25],key=lambda o:-o['height'])
    taken=set();items=[];rules=[]
    for panel in panels:
        big=[c for c in chars if c['gid'] not in taken and c['size']>=15 and panel['top']<=c['top'] and c['bottom']<=panel['bottom']]
        rows=lines_of(big)
        if len(rows)<2:continue
        left=min(c['x0'] for c in big);right=max(c['x1'] for c in big)
        if right-left>200:continue
        row_items=[(l['top'],''.join(c['text'] for c in sorted(l['chars'],key=lambda c:c['x0'])).rstrip()) for l in rows]
        bars=[l for l in page.lines if l['height']<.5 and l['x0']>=left-15 and l['x1']<=right+25 and rows[0]['top']<l['top']<rows[-1]['bottom']]
        for bar in bars:row_items.append((bar['top'],'─'*max(5,max(len(r[1]) for r in row_items))))
        items.append({'y':rows[0]['top'],'kind':'calculation','text':'\n'.join(text for _,text in sorted(row_items))})
        taken.update(c['gid'] for c in big);rules.extend(bars)
    return items,taken,rules

def page_blocks(page,rendered,code,number,low=85,high=790):
    chars=[{**c,'gid':i} for i,c in enumerate(page.chars) if c['text'].strip() and c['top']>=low and c['bottom']<=high]
    # Retain explicit spaces too; glyph IDs make completeness auditable.
    chars=[{**c,'gid':i} for i,c in enumerate(page.chars) if c['top']>=low and c['bottom']<=high]
    calculations,calculation_chars,calculation_rules=get_calculations(page,chars)
    equations,equation_chars,fraction_bars=get_equations(page,[c for c in chars if c['gid'] not in calculation_chars])
    figures=get_figures(page,chars,fraction_bars+calculation_rules)
    figures=[b for b in figures if b[1]>=low and b[3]<=high]
    tables=get_tables(page,chars,figures)
    taken=set(equation_chars)|calculation_chars;items=list(equations)+calculations
    for index,box in enumerate(figures):
        selected=[c for c in chars if inside(c,box)];taken.update(c['gid'] for c in selected)
        name=f'{code}-{number:03}-figure-{index+1}'
        im=rendered.crop(tuple(round(v*2) for v in box)).convert('RGB');im.quantize(colors=256).save(FIGURES/f'{name}.png',optimize=True)
        assets[name]=f'../../content/math-course/figures/{name}.png'
        labels='; '.join(flat(runs_of(l['chars'])) for l in lines_of(selected))
        items.append({'y':box[1],'kind':'figure','asset':name,'width':im.width,'height':im.height,'alt':f'Чертёж к теме {code}. Обозначения: {labels}'})
    for table in tables:
        taken.update(c['gid'] for c in chars if inside(c,table['box']))
        items.append({'y':table['box'][1],'kind':'table','rows':table['rows']})
    panels=[o for o in page.curves if o.get('fill') and not o.get('stroke') and o['x1']-o['x0']>450 and o['bottom']-o['top']>25]
    for line in lines_of([c for c in chars if c['gid'] not in taken]):
        runs=runs_of(line['chars']);text=flat(runs)
        if not text.strip():continue
        taken.update(c['gid'] for c in line['chars'])
        panel=next((i for i,o in enumerate(panels) if o['top']<=line['top'] and o['bottom']>=line['bottom']),None)
        size=max(c['size'] for c in line['chars'])
        bold=sum(len(c['text']) for c in line['chars'] if 'Bold' in c['fontname'])>len(text.strip())*.7
        kind='heading' if size>=20 else 'subheading' if 13<=size<15 else 'formula' if size>=15 else 'label' if text.isupper() and len(text)>3 else 'paragraph'
        items.append({'y':line['top'],'bottom':line['bottom'],'kind':kind,'runs':runs,'panel':panel,'bold':bold})
    items.sort(key=lambda i:i['y'])
    blocks=[]
    for item in items:
        last=blocks[-1] if blocks else None
        if 'runs' in item and last and last['kind']==item['kind'] and item['kind'] in ['heading','paragraph'] and last.get('panel')==item.get('panel') and last.get('bold')==item.get('bold') and item['y']-last.get('bottom',0)<7 and not re.match(r'^(?:\d{1,2}[.)]|•|Неверно:|Верно:)',flat(item['runs'])):
            append_runs(last['runs'],item['runs']);last['bottom']=item['bottom']
        else:blocks.append(item)
    # Semantic panels and examples become ordinary app cards, with flowing text.
    grouped=[];i=0
    while i<len(blocks):
        b=blocks[i]
        if b.get('panel') is not None:
            children=[b];i+=1
            while i<len(blocks) and blocks[i].get('panel')==b['panel']:children.append(blocks[i]);i+=1
            grouped.append({'kind':'callout','blocks':children});continue
        if b['kind']=='label' and flat(b.get('runs',[])).startswith('ПРИМЕР'):
            children=[b];i+=1
            while i<len(blocks) and blocks[i]['kind'] not in ['heading','subheading','label'] and blocks[i].get('panel') is None:
                children.append(blocks[i]);i+=1
                if flat(children[-1].get('runs',[])).startswith('Главная мысль'):break
            grouped.append({'kind':'example','blocks':children});continue
        grouped.append(b);i+=1
    def clean(b):
        for key in ['y','bottom','panel','bold']:b.pop(key,None)
        for child in b.get('blocks',[]):clean(child)
    for b in grouped:clean(b)
    missing=[c for c in chars if c['text'].strip() and c['gid'] not in taken]
    assert not missing,(code,number,missing)
    audit.append({'topic':code,'page':number,'glyphs':len(chars),'unassigned':len(missing),'figures':len(figures),'tables':len(tables)})
    return grouped

for grade in range(5,12):
    with pdfplumber.open(DEST/f'grade-{grade:02}.pdf') as pdf:
        renderer=pdfium.PdfDocument(DEST/f'grade-{grade:02}.pdf')
        for topic in [t for t in catalog if t['grade']==grade]:
            entry={'pages':[]}
            for pg in topic['pages']:
                n=pg['number'];p=pdf.pages[n-1];im=renderer[n-1].render(scale=2).to_pil()
                blocks=page_blocks(p,im,topic['id'],n)
                title=' '.join(flat(b.get('runs',[])) for b in blocks if b['kind']=='heading')
                entry['pages'].append({'title':title or pg['label'],'blocks':blocks})
            n=topic['practice']['page'];p=pdf.pages[n-1];im=renderer[n-1].render(scale=2).to_pil()
            hints=p.search('ПОДСКАЗКИ',regex=False)[0]['top']-2
            answers=max(m['top'] for m in p.search('Ответы',regex=False))-2
            sources=p.search('Основа:',regex=False)
            end=sources[0]['top']-2 if sources else 790
            entry['practice']={key:page_blocks(p,im,topic['id'],n,lo,hi) for key,lo,hi in [('questions',85,hints),('hints',hints,answers),('answers',answers,end)]}
            result[topic['id']]=entry
    print(f'Grade {grade}: selectable content extracted',flush=True)
(DEST/'structured.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(DEST/'extraction-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/course/figureAssets.ts').write_text('// Generated by scripts/extract-math-content.py\nexport const figureAssets: Record<string, number> = {\n'+''.join(f'  "{k}": require("{v}"),\n' for k,v in assets.items())+'};\n')
for old in FIGURES.glob('*.png'):
    if old.stem not in assets:old.unlink()
print('Topics:',len(result),'Figures:',len(assets),'Tables:',sum(a['tables'] for a in audit))
