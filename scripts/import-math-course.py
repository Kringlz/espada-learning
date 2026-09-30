"""Import the seven original PDFs and build selectable lesson content.
Usage: python scripts/import-math-course.py /path/to/pdfs
Requires pypdf, pdfplumber, pypdfium2, Pillow. Generated content is committed.
"""
from pathlib import Path
import sys, re, json, hashlib, shutil, subprocess
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'content/math-course'
DEST.mkdir(parents=True, exist_ok=True)
source = Path(sys.argv[1])
course, audit = [], []
for grade in range(5, 12):
    path = source / f'Математика_{grade:02}_класс.pdf'
    texts = [p.extract_text() or '' for p in PdfReader(path).pages]
    toc = texts[0].split('АРИФМЕТИКА\n')[-1] if grade < 7 else texts[0].split('АЛГЕБРА\n')[-1]
    topics = []
    for match in re.finditer(r'([^\n]+(?:\n(?![AG]\d\d-\d\d)[^\n]+)*)\n([AG]\d\d-\d\d)\n(\d+)\n', toc):
        title = re.sub(r'^(?:ГЕОМЕТРИЯ|СТЕРЕОМЕТРИЯ)\n', '', match[1]).replace('\n', ' ')
        topics.append((match[2], title, int(match[3])))
    assert len(topics) == {5:6,6:7,7:10,8:8,9:8,10:9,11:7}[grade]
    for idx, (code,title,start) in enumerate(topics):
        end=topics[idx+1][2]-1 if idx+1<len(topics) else len(texts)
        pages,practice=[],None
        for number in range(start,end+1):
            text=texts[number-1];lines=text.splitlines()
            if 'САМОСТОЯТЕЛЬНАЯ РАБОТА' in text:
                numbers={int(n) for n in re.findall(r'\b(0[1-9]|1[0-2])\. ',text.split('ПОДСКАЗКИ')[0])}
                count=0
                while count+1 in numbers:count+=1
                assert count>=8,(code,count)
                practice={'page':number,'count':count,'source':re.sub(r'\s+',' ',text.split('Основа:')[1].strip().rsplit('\n',2)[0]).strip() if 'Основа:' in text else 'Предоставленный конспект. Библиографическая ссылка в разделе не указана.'}
            else:pages.append({'number':number,'label':lines[3],'section':lines[2]})
        assert practice and pages,code
        course.append({'id':code,'grade':grade,'subject':'geometry' if code.startswith('G') else 'algebra','title':title,'startPage':start,'endPage':end,'pages':pages,'practice':practice})
    shutil.copyfile(path,DEST/f'grade-{grade:02}.pdf')
    audit.append({'grade':grade,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pages':len(texts),'topics':len(topics)})
(DEST/'catalog.json').write_text(json.dumps(course,ensure_ascii=False,indent=2)+'\n')
(DEST/'sources.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/course/pdfAssets.ts').write_text('// Generated original PDF assets.\nexport const pdfAssets: Record<number, number> = {\n'+''.join(f'  {g}: require("../../content/math-course/grade-{g:02}.pdf"),\n' for g in range(5,12))+'};\n')
subprocess.run([sys.executable,str(ROOT/'scripts/extract-math-content.py')],check=True)
print(f'Total: {len(course)} topics, {sum(t["practice"]["count"] for t in course)} exercises')
