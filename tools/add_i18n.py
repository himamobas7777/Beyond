# Usage: python3 tools/add_i18n.py  (edit NEW below). Appends keys to every i18n/<code>.js and to tools/i18n_keys.json.
import json,re,sys
NEW = {
 'Reply': dict(ar='رد',fr='Répondre',es='Responder',de='Antworten',it='Rispondi',ja='返信',zh='回复'),
 'Replying to {name}': dict(ar='الرد على {name}',fr='Réponse à {name}',es='Respondiendo a {name}',de='Antwort an {name}',it='In risposta a {name}',ja='{name}さんに返信中',zh='回复 {name}'),
 'Cancel reply': dict(ar='إلغاء الرد',fr='Annuler la réponse',es='Cancelar respuesta',de='Antwort abbrechen',it='Annulla risposta',ja='返信をキャンセル',zh='取消回复'),
 'Like comment': dict(ar='إعجاب بالتعليق',fr='Aimer le commentaire',es='Me gusta en el comentario',de='Kommentar liken',it='Mi piace al commento',ja='コメントにいいね',zh='赞这条评论'),
 'Unlike comment': dict(ar='إلغاء الإعجاب بالتعليق',fr='Retirer le j’aime du commentaire',es='Quitar me gusta del comentario',de='Like entfernen',it='Rimuovi mi piace al commento',ja='コメントのいいねを取り消す',zh='取消赞'),
 'No followers yet': dict(ar='لا يوجد متابعون بعد',fr='Pas encore d’abonnés',es='Aún no hay seguidores',de='Noch keine Follower',it='Ancora nessun follower',ja='まだフォロワーはいません',zh='还没有粉丝'),
 'Not following anyone yet': dict(ar='لا تتابع أحدًا بعد',fr='Ne suit encore personne',es='Aún no sigue a nadie',de='Folgt noch niemandem',it='Non segue ancora nessuno',ja='まだだれもフォローしていません',zh='还没有关注任何人'),
 '{name} replied to your comment': dict(ar='ردّ {name} على تعليقك',fr='{name} a répondu à ton commentaire',es='{name} respondió a tu comentario',de='{name} hat auf deinen Kommentar geantwortet',it='{name} ha risposto al tuo commento',ja='{name}さんがあなたのコメントに返信しました',zh='{name} 回复了你的评论'),
 '{name} liked your comment': dict(ar='أعجب {name} بتعليقك',fr='{name} a aimé ton commentaire',es='A {name} le gustó tu comentario',de='{name} gefällt dein Kommentar',it='A {name} piace il tuo commento',ja='{name}さんがあなたのコメントにいいねしました',zh='{name} 赞了你的评论'),
 'Central Asia': dict(ar='آسيا الوسطى',fr='Asie centrale',es='Asia Central',de='Zentralasien',it='Asia centrale',ja='中央アジア',zh='中亚'),
 'Your username will be @{u}. You can change it later in Edit profile.': dict(ar='سيكون اسم المستخدم الخاص بك @{u}. يمكنك تغييره لاحقًا من تعديل الملف الشخصي.',fr='Ton nom d’utilisateur sera @{u}. Tu pourras le changer plus tard dans Modifier le profil.',es='Tu nombre de usuario será @{u}. Puedes cambiarlo después en Editar perfil.',de='Dein Benutzername wird @{u}. Du kannst ihn später unter Profil bearbeiten ändern.',it='Il tuo nome utente sarà @{u}. Puoi cambiarlo più tardi in Modifica profilo.',ja='ユーザー名は @{u} になります。あとでプロフィール編集から変更できます。',zh='你的用户名将是 @{u}。之后可以在编辑资料里修改。'),
 'Suggestions': dict(ar='اقتراحات',fr='Suggestions',es='Sugerencias',de='Vorschläge',it='Suggerimenti',ja='候補',zh='推荐'),
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
