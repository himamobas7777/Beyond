# Validates translated chunks: same length, valid JSON, numbers/URLs preserved. Usage: python3 check_tr.py <dir> [lang...]
import json,re,sys,os,collections
d=sys.argv[1]; langs=sys.argv[2:] or ['ar','fr','es','de','it','ja','zh']
num=lambda s: collections.Counter(re.findall(r'\d+',s))
for L in langs:
    for n in (1,2,3):
        f=f'{d}/out_{L}_{n}.json'
        if not os.path.exists(f): print(L,n,'MISSING'); continue
        try: o=json.load(open(f,encoding='utf8')); i=json.load(open(f'{d}/in_{n}.json',encoding='utf8'))
        except Exception as e: print(L,n,'BAD JSON',e); continue
        if len(o)!=len(i): print(L,n,'LEN',len(o),len(i)); continue
        bad=[]
        for k,(a,b) in enumerate(zip(i,o)):
            if not isinstance(b,str) or not b.strip(): bad.append((k,'empty')); continue
            miss=num(a)-num(b); extra={x:c for x,c in (num(b)-num(a)).items() if int(x)>31}
            if miss or extra: bad.append((k,'num','missing',dict(miss),'extra',extra))
            for u in re.findall(r'https?://\S+',a):
                if u.rstrip('.,;)') not in b: bad.append((k,'url',u))
        print(L,n,'ok' if not bad else f'{len(bad)} issues',bad[:3])
