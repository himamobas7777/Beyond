# Usage: python3 tools/add_i18n.py  (edit NEW below). Appends keys to every i18n/<code>.js and to tools/i18n_keys.json.
import json,re,sys
NEW = {
 "Messages, {n} unread": dict(ar="الرسائل، {n} غير مقروءة", fr="Messages, {n} non lus", es="Mensajes, {n} sin leer", de="Nachrichten, {n} ungelesen", it="Messaggi, {n} da leggere", ja="メッセージ、未読{n}件", zh="消息，{n} 条未读"),
 "Messages": dict(ar="الرسائل", fr="Messages", es="Mensajes", de="Nachrichten", it="Messaggi", ja="メッセージ", zh="消息"),
 "You can message people who follow you back.": dict(ar="تقدر تراسل الناس اللي بيتابعوك بالمقابل.", fr="Vous pouvez écrire aux personnes qui vous suivent en retour.", es="Puedes escribir a quienes te siguen de vuelta.", de="Du kannst Personen schreiben, die dir auch folgen.", it="Puoi scrivere alle persone che ti seguono a loro volta.", ja="フォローし返してくれた人にメッセージを送れます。", zh="你可以给互相关注的人发消息。"),
 "No messages yet": dict(ar="لا توجد رسائل بعد", fr="Aucun message pour l’instant", es="Aún no hay mensajes", de="Noch keine Nachrichten", it="Ancora nessun messaggio", ja="まだメッセージはありません", zh="还没有消息"),
 "Follow someone and ask them to follow you back. Then you can chat here.": dict(ar="تابع شخصًا واطلب منه أن يتابعك بالمقابل. بعدها تقدران تتحدثان هنا.", fr="Suivez quelqu’un et demandez-lui de vous suivre en retour. Vous pourrez alors discuter ici.", es="Sigue a alguien y pídele que te siga de vuelta. Entonces podréis chatear aquí.", de="Folge jemandem und bitte die Person, dir zurückzufolgen. Dann könnt ihr hier chatten.", it="Segui qualcuno e chiedi di ricambiare. Poi potrete chattare qui.", ja="誰かをフォローして、フォローを返してもらいましょう。そうすればここでチャットできます。", zh="关注某人并请对方回关，之后就可以在这里聊天了。"),
 "Start a chat": dict(ar="ابدأ محادثة", fr="Démarrer une discussion", es="Iniciar un chat", de="Chat starten", it="Inizia una chat", ja="チャットを始める", zh="开始聊天"),
 "Message {name}": dict(ar="راسل {name}", fr="Écrire à {name}", es="Escribir a {name}", de="{name} schreiben", it="Scrivi a {name}", ja="{name}にメッセージ", zh="给 {name} 发消息"),
 "Message": dict(ar="رسالة", fr="Message", es="Mensaje", de="Nachricht", it="Messaggio", ja="メッセージ", zh="发消息"),
 "You": dict(ar="أنت", fr="Vous", es="Tú", de="Du", it="Tu", ja="あなた", zh="你"),
 "Seen": dict(ar="تمت القراءة", fr="Vu", es="Visto", de="Gelesen", it="Visto", ja="既読", zh="已读"),
 "Chat options": dict(ar="خيارات المحادثة", fr="Options de la discussion", es="Opciones del chat", de="Chat-Optionen", it="Opzioni della chat", ja="チャットのオプション", zh="聊天选项"),
 "Unblock this person": dict(ar="إلغاء حظر هذا الشخص", fr="Débloquer cette personne", es="Desbloquear a esta persona", de="Person entsperren", it="Sblocca questa persona", ja="ブロックを解除", zh="取消屏蔽此人"),
 "Block this person": dict(ar="حظر هذا الشخص", fr="Bloquer cette personne", es="Bloquear a esta persona", de="Person blockieren", it="Blocca questa persona", ja="この人をブロック", zh="屏蔽此人"),
 "Report this chat": dict(ar="الإبلاغ عن هذه المحادثة", fr="Signaler cette discussion", es="Denunciar este chat", de="Diesen Chat melden", it="Segnala questa chat", ja="このチャットを報告", zh="举报此聊天"),
 "Delete this chat for me": dict(ar="حذف هذه المحادثة عندي", fr="Supprimer cette discussion pour moi", es="Eliminar este chat para mí", de="Chat für mich löschen", it="Elimina questa chat per me", ja="このチャットを自分用に削除", zh="为我删除此聊天"),
 "Confirm delete": dict(ar="تأكيد الحذف", fr="Confirmer la suppression", es="Confirmar eliminación", de="Löschen bestätigen", it="Conferma eliminazione", ja="削除を確認", zh="确认删除"),
 "Unblocked.": dict(ar="تم إلغاء الحظر.", fr="Débloqué.", es="Desbloqueado.", de="Entsperrt.", it="Sbloccato.", ja="ブロックを解除しました。", zh="已取消屏蔽。"),
 "Blocked. They can no longer message you.": dict(ar="تم الحظر. لن يقدر على مراسلتك بعد الآن.", fr="Bloqué. Cette personne ne peut plus vous écrire.", es="Bloqueado. Ya no puede escribirte.", de="Blockiert. Die Person kann dir nicht mehr schreiben.", it="Bloccato. Non può più scriverti.", ja="ブロックしました。この人はもうメッセージを送れません。", zh="已屏蔽。对方无法再给你发消息。"),
 "Thanks. We will review it. The last 10 messages are sent to us.": dict(ar="شكرًا. هنراجعه. بيتم إرسال آخر 10 رسائل لنا.", fr="Merci. Nous allons l’examiner. Les 10 derniers messages nous sont envoyés.", es="Gracias. Lo revisaremos. Se nos envían los últimos 10 mensajes.", de="Danke. Wir prüfen das. Die letzten 10 Nachrichten werden an uns gesendet.", it="Grazie. Lo esamineremo. Ci vengono inviati gli ultimi 10 messaggi.", ja="ありがとうございます。確認します。直近10件のメッセージが私たちに送信されます。", zh="谢谢，我们会审核。最近 10 条消息会发送给我们。"),
 "Chat deleted for you.": dict(ar="تم حذف المحادثة عندك.", fr="Discussion supprimée pour vous.", es="Chat eliminado para ti.", de="Chat für dich gelöscht.", it="Chat eliminata per te.", ja="チャットを削除しました。", zh="已为你删除聊天。"),
 "Write a message": dict(ar="اكتب رسالة", fr="Écrire un message", es="Escribe un mensaje", de="Nachricht schreiben", it="Scrivi un messaggio", ja="メッセージを書く", zh="写消息"),
 "Send message": dict(ar="إرسال الرسالة", fr="Envoyer le message", es="Enviar mensaje", de="Nachricht senden", it="Invia messaggio", ja="メッセージを送信", zh="发送消息"),
 "You blocked this person. Unblock them from the menu to chat again.": dict(ar="أنت حظرت هذا الشخص. ألغِ الحظر من القائمة لتتحدثا من جديد.", fr="Vous avez bloqué cette personne. Débloquez-la depuis le menu pour discuter de nouveau.", es="Has bloqueado a esta persona. Desbloquéala desde el menú para chatear de nuevo.", de="Du hast diese Person blockiert. Entsperre sie im Menü, um wieder zu chatten.", it="Hai bloccato questa persona. Sbloccala dal menu per chattare di nuovo.", ja="この人をブロックしています。メニューから解除すると再びチャットできます。", zh="你已屏蔽此人。从菜单取消屏蔽后才能再次聊天。"),
 "You can only message people who follow you back.": dict(ar="تقدر تراسل بس الناس اللي بيتابعوك بالمقابل.", fr="Vous ne pouvez écrire qu’aux personnes qui vous suivent en retour.", es="Solo puedes escribir a quienes te siguen de vuelta.", de="Du kannst nur Personen schreiben, die dir auch folgen.", it="Puoi scrivere solo a chi ti segue a sua volta.", ja="フォローし返してくれた人にだけメッセージを送れます。", zh="只能给互相关注的人发消息。"),
 "Say hi. Be kind and keep it safe.": dict(ar="قل مرحبًا. كن لطيفًا وحافظ على أمانك.", fr="Dites bonjour. Soyez bienveillant et restez prudent.", es="Saluda. Sé amable y cuídate.", de="Sag Hallo. Sei freundlich und bleib sicher.", it="Saluta. Sii gentile e stai al sicuro.", ja="まずは挨拶を。優しく、安全に。", zh="打个招呼吧。友善相处，注意安全。"),
 "Message must be 1 to 1000 characters": dict(ar="يجب أن تكون الرسالة من 1 إلى 1000 حرف", fr="Le message doit contenir de 1 à 1000 caractères", es="El mensaje debe tener de 1 a 1000 caracteres", de="Die Nachricht muss 1 bis 1000 Zeichen lang sein", it="Il messaggio deve avere da 1 a 1000 caratteri", ja="メッセージは1〜1000文字にしてください", zh="消息长度必须为 1 到 1000 个字符"),
 "You can not message this person": dict(ar="لا يمكنك مراسلة هذا الشخص", fr="Vous ne pouvez pas écrire à cette personne", es="No puedes escribir a esta persona", de="Du kannst dieser Person nicht schreiben", it="Non puoi scrivere a questa persona", ja="この人にはメッセージを送れません", zh="你无法给此人发消息"),
 "Slow down a little": dict(ar="تمهّل قليلًا", fr="Doucement, un peu plus lentement", es="Ve un poco más despacio", de="Etwas langsamer bitte", it="Rallenta un po’", ja="少しゆっくり送ってください", zh="请慢一点"),
 "Invalid recipient": dict(ar="مستلم غير صالح", fr="Destinataire invalide", es="Destinatario no válido", de="Ungültiger Empfänger", it="Destinatario non valido", ja="無効な宛先です", zh="收件人无效"),
 "Not signed in": dict(ar="لم تسجّل الدخول", fr="Non connecté", es="No has iniciado sesión", de="Nicht angemeldet", it="Accesso non effettuato", ja="サインインしていません", zh="未登录"),
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
