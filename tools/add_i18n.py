# Usage: python3 tools/add_i18n.py  (edit NEW below). Appends keys to every i18n/<code>.js and to tools/i18n_keys.json.
import json,re,sys
NEW = {
 '{n} view': dict(ar='{n} مشاهدة',fr='{n} vue',es='{n} vista',de='{n} Aufruf',it='{n} visualizzazione',ja='{n}回表示',zh='{n} 次浏览'),
 '{n} views': dict(ar='{n} مشاهدة',fr='{n} vues',es='{n} vistas',de='{n} Aufrufe',it='{n} visualizzazioni',ja='{n}回表示',zh='{n} 次浏览'),
}
if __name__ == '__main__':
    for code in ['ar','fr','es','de','it','ja','zh']:
        p=f'i18n/{code}.js'; s=open(p,encoding='utf8').read()
        add=''.join(f'  {json.dumps(k,ensure_ascii=False)}: {json.dumps(v[code],ensure_ascii=False)},\n' for k,v in NEW.items() if json.dumps(k,ensure_ascii=False)+':' not in s)
        if add:
            i=s.rindex('}'); body=s[:i].rstrip()
            if not body.endswith(','): body+=','
            s=body+'\n'+add.rstrip(',\n')+'\n'+s[i:]
            open(p,'w',encoding='utf8').write(s)
    k=json.load(open('tools/i18n_keys.json',encoding='utf8')); k=sorted(set(k)|set(NEW))
    json.dump(k,open('tools/i18n_keys.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
    print(len(k),'keys')
