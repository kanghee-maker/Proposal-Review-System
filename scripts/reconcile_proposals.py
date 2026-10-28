"""Reconcile proposal sources against the authoritative workbook without editing originals."""
import argparse, collections, hashlib, json, mimetypes, pathlib, re, shutil, warnings, zipfile, posixpath
import xml.etree.ElementTree as ET
import openpyxl

warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')
EXCLUDED={23,36,62,87,100,129,131,141}
REVISION='2026-10-28-department-sources'
def norm(v): return re.sub(r'[^a-z0-9가-힣]','',str(v).lower())
def dump(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def fields(sheet):
    found={}
    for row in sheet.iter_rows(min_row=1,max_row=max(sheet.max_row,15),max_col=max(sheet.max_column,3)):
        vals=[str(c.value).strip() if c.value is not None else '' for c in row]
        for i,label in enumerate(vals):
            key=norm(label)
            if key in {'제안자','제안명','배경','추진내용','기대효과'}:
                value='\n'.join(v for v in vals[i+1:] if v)
                if value and key not in found: found[key]=value
    return found

def xml_sheets(file):
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(file) as z:
        strings=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            strings=[''.join(t.text or '' for t in n.findall('.//s:t',ns)) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
        rels={n.attrib['Id']:n.attrib['Target'] for n in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        result=[]
        for s in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',ns):
            target=rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            part=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
            rows=[]
            for row in ET.fromstring(z.read(part)).findall('s:sheetData/s:row',ns):
                vals=[]
                for c in row.findall('s:c',ns):
                    v=c.find('s:v',ns);value=v.text if v is not None and v.text else ''
                    if c.attrib.get('t')=='s':value=strings[int(value)] if value else ''
                    elif c.attrib.get('t')=='inlineStr':value=''.join(t.text or '' for t in c.findall('.//s:t',ns))
                    col=0
                    for ch in re.match('[A-Z]+',c.attrib['r'])[0]:col=col*26+ord(ch)-64
                    while len(vals)<col:vals.append('')
                    vals[col-1]=value.strip()
                rows.append(vals)
            result.append((s.attrib['name'],rows))
        return result

def row_fields(rows):
    found={}
    for vals in rows:
        for i,label in enumerate(vals):
            key=norm(label)
            if key in {'제안자','제안명','배경','추진내용','기대효과'}:
                value='\n'.join(v for v in vals[i+1:] if v)
                if value and key not in found:found[key]=value
    return found

def main():
    ap=argparse.ArgumentParser();ap.add_argument('source');ap.add_argument('--repo',default='.');args=ap.parse_args()
    root=pathlib.Path(args.source);repo=pathlib.Path(args.repo).resolve();data=repo/'data'
    base=json.loads((data/'proposals_2026_structured.json').read_text('utf-8-sig'))
    wb=openpyxl.load_workbook(repo/'2026년 제안 심사 취합본 AI.xlsx',data_only=True)
    master={str(int(r[1])):{'title':str(r[9]),'person':str(r[2])} for r in list(wb.active.values)[1:] if r[1]}
    assert len(master)==134 and not (set(map(int,master)) & EXCLUDED)
    assert len(base)==134
    groups=collections.defaultdict(list)
    for f in root.rglob('*'):
        if f.is_file() and f.parent!=root:
            m=re.match(r'^(\d+)_',f.name);assert m,f
            board=str(int(m[1])); assert board in master,f
            groups[board].append(f)
    assert set(groups)==set(master), (set(master)-set(groups))
    report=[];catalog={}
    for p in base:
        board=str(int(p['board_no']));canonical=master[board]
        assert p['title']==canonical['title'] and p['proposer']==canonical['person']
        files=sorted(groups[board]);mainfiles=[f for f in files if f.suffix.lower()=='.xlsx' and '보충자료' not in f.name]
        assert len(mainfiles)==1,(board,mainfiles)
        source=mainfiles[0];person=source.stem.rsplit('_',1)[1];assert norm(person)==norm(p['proposer'])
        w=xml_sheets(source)
        sheets=[(name,row_fields(rows)) for name,rows in w if name!='.']
        candidates=[(s,v) for s,v in sheets if norm(v.get('제안자',''))==norm(person)]
        exact=[(s,v) for s,v in candidates if norm(v.get('제안명',''))==norm(source.stem.split('_',1)[1].rsplit('_',1)[0])]
        if exact:candidates=exact
        assert len(candidates)==1,(board,str(source),sheets)
        sheet,v=candidates[0];internal=v.get('제안명','');filetitle=source.stem.split('_',1)[1].rsplit('_',1)[0]
        assert norm(internal)==norm(filetitle) or int(board) in {150,152},(board,internal,filetitle)
        assert v.get('추진내용'),(board,'empty content')
        attachments=[];hashes=[]
        ordered=[source]+[f for f in files if f!=source]
        for i,f in enumerate(ordered,1):
            relative=f.relative_to(root);folder=relative.parts[0]
            dest=repo/'public'/'proposal-sources'/folder/board/f.name
            dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest)
            digest=hashlib.sha256(f.read_bytes()).hexdigest();assert hashlib.sha256(dest.read_bytes()).hexdigest()==digest
            url='/'+dest.relative_to(repo/'public').as_posix()
            from urllib.parse import quote
            att={'id':f'source-{board}-{i}','name':f.name,'size':f.stat().st_size,'type':mimetypes.guess_type(f.name)[0] or 'application/octet-stream','uploaded_at':'2026-10-28T00:00:00Z','static_url':quote(url,safe='/'),'sha256':digest}
            attachments.append(att);hashes.append({'path':dest.relative_to(repo).as_posix(),'sha256':digest,'size':att['size']})
        extra=[]
        for name,rows in w:
            if name in {sheet,'.'} or '예시' in name:continue
            extra.append({'sheetName':name,'rows':rows})
        p.update(background=v.get('배경',''),content=v['추진내용'],expected_effect=v.get('기대효과',''),extra_sheets=extra,default_attachments=attachments,source_revision=REVISION)
        p['attachment_note']='원본 제안서의 사진·도표와 추가 시트는 첨부된 Excel에서 확인할 수 있습니다.'
        catalog[board]={'board_no':board,'title':p['title'],'proposer':p['proposer'],'background':p['background'],'content':p['content'],'expected_effect':p['expected_effect'],'attachment_note':p['attachment_note'],'extra_sheets':extra,'default_attachments':attachments,'source_revision':REVISION}
        report.append({'board_no':board,'title':p['title'],'proposer':p['proposer'],'department_folder':source.relative_to(root).parts[0],'source_sheet':sheet,'source_title':internal,'title_wording_differs':norm(internal)!=norm(p['title']),'files':hashes})
    dump(data/'proposals_2026_structured.json',base);dump(data/'proposal_source_catalog.json',catalog)
    # Existing sessions retain their IDs, assignments and evaluation state.
    original_local=json.loads((data/'proposals_store.json').read_text('utf8'))
    local=[p for p in original_local if int(p.get('board_no') or 0) not in EXCLUDED]
    for p in local:
        item=catalog.get(str(p.get('board_no','')))
        if item and norm(p.get('proposer_name',''))==norm(item['proposer']):
            for key in ['title','background','content','expected_effect','attachment_note','extra_sheets']:p[key]=item[key]
            uploaded=[a for a in p.get('attachments',[]) if not a.get('static_url','').startswith(('/default-attachments/','/proposal-sources/')) and '-att-default-' not in a['id'] and '-att-source-' not in a['id']]
            p['attachments']=[{**a,'id':f"{p['id']}-att-source-{item['board_no']}-{i}",'proposal_id':p['id']} for i,a in enumerate(item['default_attachments'],1)]+uploaded
    dump(data/'proposals_store.json',local)
    sessions=json.loads((data/'sessions.json').read_text('utf8'))
    for session in sessions:
        removed=sum(p.get('session_id')==session['id'] for p in original_local if p not in local and int(p.get('board_no') or 0) in EXCLUDED)
        if removed:session['proposals_count']=max(0,session['proposals_count']-removed)
    dump(data/'sessions.json',sessions)
    dump(repo/'docs'/'proposal-source-manifest.json',{'revision':REVISION,'proposals':report,'proposal_count':len(report),'file_count':sum(len(x['files']) for x in report)})
    print(json.dumps({'proposals':len(report),'files':sum(len(x['files']) for x in report),'wording_differences':sum(x['title_wording_differs'] for x in report)},ensure_ascii=False))
if __name__=='__main__':main()
