// Beyond web push sender. Deployed with verify_jwt = false because it does its own checks:
//   GET  -> returns the public VAPID key (public by design; creates the key pair the first time)
//   POST -> only accepted from the database trigger (header x-push-secret must match push_config.trigger_secret)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE = "https://himamobas7777.github.io/Beyond/";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

// order: like, likeComment, comment, reply, follow, someone, message
const TXT: Record<string, string[]> = {
  en: ["{name} liked your post", "{name} liked your comment", "{name} commented on your post", "{name} replied to your comment", "{name} started following you", "Someone", "{name} sent you a message"],
  ar: ["أعجب {name} بمنشورك", "أعجب {name} بتعليقك", "علّق {name} على منشورك", "ردّ {name} على تعليقك", "بدأ {name} بمتابعتك", "شخص ما", "أرسل لك {name} رسالة"],
  fr: ["{name} a aimé ton post", "{name} a aimé ton commentaire", "{name} a commenté ton post", "{name} a répondu à ton commentaire", "{name} a commencé à te suivre", "Quelqu’un", "{name} t’a envoyé un message"],
  es: ["A {name} le gustó tu publicación", "A {name} le gustó tu comentario", "{name} comentó tu publicación", "{name} respondió a tu comentario", "{name} empezó a seguirte", "Alguien", "{name} te envió un mensaje"],
  de: ["{name} gefällt dein Beitrag", "{name} gefällt dein Kommentar", "{name} hat deinen Beitrag kommentiert", "{name} hat auf deinen Kommentar geantwortet", "{name} folgt dir jetzt", "Jemand", "{name} hat dir eine Nachricht geschickt"],
  it: ["A {name} piace il tuo post", "A {name} piace il tuo commento", "{name} ha commentato il tuo post", "{name} ha risposto al tuo commento", "{name} ha iniziato a seguirti", "Qualcuno", "{name} ti ha inviato un messaggio"],
  ja: ["{name}さんがあなたの投稿にいいねしました", "{name}さんがあなたのコメントにいいねしました", "{name}さんがあなたの投稿にコメントしました", "{name}さんがあなたのコメントに返信しました", "{name}さんがあなたをフォローしました", "だれか", "{name}さんからメッセージが届きました"],
  zh: ["{name} 赞了你的帖子", "{name} 赞了你的评论", "{name} 评论了你的帖子", "{name} 回复了你的评论", "{name} 开始关注你了", "某人", "{name} 给你发了一条消息"],
};

const TEST: Record<string, string> = { en: "Test alert: it works!", ar: "تنبيه تجريبي: شغّال!", fr: "Alerte de test : ça marche !", es: "Alerta de prueba: ¡funciona!", de: "Testbenachrichtigung: Es funktioniert!", it: "Avviso di prova: funziona!", ja: "テスト通知：届きました！", zh: "测试通知：成功了！" };

async function cfg(key: string): Promise<string | null> {
  const { data } = await sb.from("push_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}
async function vapid() {
  let pub = await cfg("vapid_public"), priv = await cfg("vapid_private");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    await sb.from("push_config").upsert([{ key: "vapid_public", value: k.publicKey }, { key: "vapid_private", value: k.privateKey }], { onConflict: "key", ignoreDuplicates: true });
    pub = await cfg("vapid_public"); priv = await cfg("vapid_private");
  }
  return { pub: pub!, priv: priv! };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") { const v = await vapid(); return json({ publicKey: v.pub }); }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const secret = await cfg("trigger_secret");
  if (!secret || req.headers.get("x-push-secret") !== secret) return json({ error: "forbidden" }, 403);
  let body: { kind?: string; id?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!body.id || (body.kind !== "notification" && body.kind !== "message" && body.kind !== "test")) return json({ error: "bad request" }, 400);

  // who gets it, who caused it, what to open
  let userId: string, actorId: string | null, url: string, tag: string, textIdx: number;
  if (body.kind === "test") { userId = body.id; actorId = null; textIdx = 0; tag = "test"; url = "?open=notifications"; }
  else if (body.kind === "message") {
    const { data: m } = await sb.from("messages").select("sender_id, recipient_id").eq("id", body.id).maybeSingle();
    if (!m) return json({ ok: true, skipped: "gone" });
    userId = m.recipient_id; actorId = m.sender_id; textIdx = 6; tag = "msg-" + m.sender_id; url = "?open=chat&id=" + m.sender_id;
  } else {
    const { data: n } = await sb.from("notifications").select("user_id, actor_id, type, detail, post_id").eq("id", body.id).maybeSingle();
    if (!n) return json({ ok: true, skipped: "gone" });
    userId = n.user_id; actorId = n.actor_id; tag = "n-" + body.id;
    if (n.type === "follow") { textIdx = 4; url = actorId ? "?open=user&id=" + actorId : "?open=notifications"; }
    else if (n.type === "like") { textIdx = n.detail === "comment" ? 1 : 0; url = n.post_id ? "?open=post&id=" + n.post_id : "?open=notifications"; }
    else { textIdx = n.detail === "reply" ? 3 : 2; url = n.post_id ? "?open=post&id=" + n.post_id : "?open=notifications"; }
  }
  const { data: actor } = actorId ? await sb.from("profiles").select("display_name, username").eq("id", actorId).maybeSingle() : { data: null };
  const { data: subs } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth, lang").eq("user_id", userId);
  if (!subs || !subs.length) return json({ ok: true, sent: 0 });

  const v = await vapid();
  webpush.setVapidDetails(SITE, v.pub, v.priv);
  let sent = 0; const dead: string[] = []; const failed: number[] = [];
  await Promise.all(subs.map(async (s) => {
    const dict = TXT[s.lang] || TXT.en;
    const name = (actor?.display_name || (actor?.username ? "@" + actor.username : "")) || dict[5];
    const payload = JSON.stringify({ title: "Beyond", body: body.kind === "test" ? (TEST[s.lang] || TEST.en) : dict[textIdx].replace("{name}", name), url, tag, lang: s.lang });
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "normal" }); sent++; }
    catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) dead.push(s.id); else { console.error("push failed", code); failed.push(code ?? 0); } }
  }));
  if (dead.length) await sb.from("push_subscriptions").delete().in("id", dead);
  return json({ ok: true, sent, removed: dead.length, failed });
});
