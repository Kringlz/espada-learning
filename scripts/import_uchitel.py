#!/usr/bin/env python3
"""Fetch an explicit allowlist, cache articles, preserve formula markup for review.
No answers are imported into lessons automatically. Run from repository root.
"""
import argparse, hashlib, json, pathlib, re, time, urllib.request
from html.parser import HTMLParser
from urllib.parse import quote, urlsplit

class Article(HTMLParser):
    def __init__(self):
        super().__init__(); self.depth=0; self.active=False; self.skip=0; self.parts=[]; self.images=[]; self.headings=[]; self.heading=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if not self.active:
            if not {'entry-content','the_content_wrapper'}.intersection(a.get('class','').split()): return
            self.active=True; self.depth=1; return
        if tag not in ('img','br','hr','input','meta','link','source','wbr'): self.depth+=1
        if tag in ('script','style','noscript'): self.skip+=1
        if self.skip: return
        if tag in ('h1','h2','h3','h4','p','li','div','tr','br'): self.parts.append('\n')
        if tag in ('h1','h2','h3','h4'): self.heading=[]
        if tag=='sup': self.parts.append('^(')
        if tag=='sub': self.parts.append('_(')
        if tag=='img':
            self.images.append({'src':a.get('src',''), 'alt':a.get('alt','')})
            self.parts.append('[ИЗОБРАЖЕНИЕ: '+a.get('alt','без описания')+']')
    def handle_endtag(self,tag):
        if not self.active or tag in ('img','br','hr','input','meta','link','source','wbr'): return
        if tag in ('script','style','noscript'): self.skip=max(0,self.skip-1)
        if not self.skip:
            if tag in ('sup','sub'): self.parts.append(')')
            if tag in ('h1','h2','h3','h4') and self.heading is not None:
                self.headings.append(''.join(self.heading).strip()); self.heading=None
            if tag in ('p','li','h2','h3','h4','div','tr'): self.parts.append('\n')
        self.depth-=1
        if self.depth<=0: self.active=False
    def handle_data(self,data):
        if self.active and not self.skip:
            self.parts.append(data)
            if self.heading is not None: self.heading.append(data)
    def text(self):
        return '\n'.join(re.sub(r'\s+',' ',line).strip() for line in ''.join(self.parts).splitlines() if line.strip())

def run():
    ap=argparse.ArgumentParser(); ap.add_argument('--refresh',action='store_true'); ap.add_argument('--cache',default='tmp/uchitel'); args=ap.parse_args()
    root=pathlib.Path(__file__).resolve().parents[1]
    manifest=json.loads((root/'content/math-course/video-lessons/sources.json').read_text())
    cache=root/args.cache; cache.mkdir(parents=True,exist_ok=True); report=[]
    for source in manifest:
        url=source['url']; parts=urlsplit(url)
        if parts.scheme!='https' or parts.hostname!='uchitel.pro': raise ValueError('Only uchitel.pro HTTPS articles are allowed')
        raw=cache/(source['id']+'.html')
        try:
            if args.refresh or not raw.exists():
                req=urllib.request.Request(quote(url,safe=':/%'),headers={'User-Agent':'Espada educational source review/1.0'})
                with urllib.request.urlopen(req,timeout=30) as response:
                    if urlsplit(response.url).hostname!='uchitel.pro': raise ValueError('Unexpected redirect')
                    body=response.read(5_000_001)
                    if len(body)>5_000_000: raise ValueError('Article too large')
                    raw.write_bytes(body)
                time.sleep(0.5)
            body=raw.read_bytes(); article=Article(); article.feed(body.decode('utf-8'))
            extracted=article.text()
            if len(extracted)<100: raise ValueError('Article selector changed or empty')
            (cache/(source['id']+'.txt')).write_text(extracted)
            item={**source,'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body),'textCharacters':len(extracted),'headings':article.headings,'images':len(article.images),'requiresImageReview':bool(article.images),'status':'review-required'}
        except Exception as e: item={**source,'status':'error','error':str(e)}
        report.append(item); print(source['id'],item['status'],item.get('textCharacters',''))
    (cache/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if any(r['status']=='error' for r in report): raise SystemExit(1)
if __name__=='__main__': run()
