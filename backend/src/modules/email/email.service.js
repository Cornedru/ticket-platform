/**
 * Email Service — TicketHub
 * Provider: Resend (https://resend.com) — RGPD compliant
 * Fallback: Log to console in development
 */

const EMAIL_ENABLED = process.env.FEATURE_EMAIL_ENABLED === 'true'
const FROM = process.env.EMAIL_FROM || 'noreply@tickethub.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'TicketHub'

async function sendEmail({ to, subject, html }) {
  if (!EMAIL_ENABLED || !process.env.EMAIL_API_KEY) {
    console.log(`📧 [Email DEV] To: ${to} | Subject: ${subject}`)
    return { success: true, dev: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: [to], subject, html }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Email send error:', err)
      return { success: false, error: err }
    }
    return { success: true }
  } catch (err) {
    console.error('Email service error:', err)
    return { success: false, error: err.message }
  }
}

/* ===== EMAIL TEMPLATES ===== */

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>TicketHub</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0A0A08; font-family:'DM Sans',Arial,sans-serif; color:#EDE9E0; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .header { text-align:center; padding:32px 0; border-bottom:1px solid rgba(237,233,224,0.08); margin-bottom:32px; }
  .logo { font-size:1.4rem; font-weight:700; color:#C4973A; letter-spacing:0.1em; }
  .logo-mark { display:inline-block; background:#C4973A; color:#070707; padding:4px 8px; font-size:0.75rem; font-weight:800; margin-right:8px; }
  h1 { font-size:1.8rem; margin-bottom:12px; line-height:1.2; }
  p { color:rgba(237,233,224,0.7); line-height:1.7; margin-bottom:16px; }
  .btn { display:inline-block; background:#C4973A; color:#070707; padding:14px 32px; font-weight:700; text-decoration:none; font-size:0.85rem; letter-spacing:0.08em; text-transform:uppercase; margin:16px 0; }
  .ticket-box { background:#161614; border:1px solid rgba(196,151,58,0.3); padding:24px; margin:24px 0; border-radius:4px; }
  .ticket-info { margin-bottom:8px; font-size:0.88rem; }
  .ticket-label { color:rgba(237,233,224,0.4); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
  .qr-wrap { text-align:center; padding:20px; background:#0A0A08; border-radius:4px; margin-top:16px; }
  .qr-wrap img { max-width:180px; border:4px solid #EDE9E0; }
  .footer { text-align:center; padding:32px 0 16px; border-top:1px solid rgba(237,233,224,0.08); margin-top:40px; }
  .footer p { font-size:0.72rem; color:rgba(237,233,224,0.3); }
  .gold { color:#C4973A; }
  .divider { height:1px; background:rgba(237,233,224,0.08); margin:24px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo"><span class="logo-mark">TH</span> TicketHub</div>
  </div>
  ${content}
  <div class="footer">
    <p>TicketHub · Tous droits réservés · <a href="#" style="color:rgba(237,233,224,0.5)">Se désabonner</a></p>
    <p>Cet email a été envoyé car vous avez effectué un achat sur TicketHub.</p>
  </div>
</div>
</body>
</html>`
}

export async function sendOrderConfirmation({ user, order, event, tickets }) {
  const ticketHtml = tickets.map((ticket, i) => `
    <div class="ticket-box">
      <div class="ticket-label">Billet #${i + 1}</div>
      <div class="ticket-info"><strong>${event.title}</strong></div>
      <div class="ticket-info" style="color:rgba(237,233,224,0.5);font-size:0.8rem;">${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div class="ticket-info" style="color:rgba(237,233,224,0.5);font-size:0.8rem;">📍 ${event.location}</div>
      <div class="qr-wrap">
        <img src="${ticket.qrCode}" alt="QR Code billet #${i + 1}"/>
        <p style="font-size:0.68rem;color:rgba(237,233,224,0.3);margin-top:8px;font-family:monospace;">
          ID: ${ticket.id.slice(0, 16).toUpperCase()}
        </p>
      </div>
    </div>
  `).join('')

  const html = baseTemplate(`
    <h1>🎉 Commande <span class="gold">confirmée !</span></h1>
    <p>Bonjour <strong>${user.name}</strong>,</p>
    <p>Votre paiement a bien été reçu. Voici vos billets pour <strong>${event.title}</strong>.</p>
    
    <div class="divider"></div>
    <div class="ticket-label">Récapitulatif de commande</div>
    <div class="ticket-info">Référence : <span class="gold">#${order.id.slice(0, 8).toUpperCase()}</span></div>
    <div class="ticket-info">Montant : <strong>${order.totalPrice?.toFixed(2)} €</strong></div>
    <div class="ticket-info">Billets : ${order.quantity} × ${event.title}</div>
    <div class="divider"></div>
    
    ${ticketHtml}
    
    <p style="margin-top:24px;">Présentez votre QR code à l'entrée. Bonne expérience !</p>
    <p>L'équipe TicketHub</p>
  `)

  return sendEmail({
    to: user.email,
    subject: `✦ Vos billets pour ${event.title} — TicketHub`,
    html,
  })
}

export async function sendWelcomeEmail({ user }) {
  const html = baseTemplate(`
    <h1>Bienvenue sur <span class="gold">TicketHub</span> !</h1>
    <p>Bonjour <strong>${user.name}</strong>,</p>
    <p>Votre compte a été créé avec succès. Vous pouvez maintenant découvrir et réserver des billets pour les meilleurs événements.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Découvrir les événements</a>
    <p>À bientôt sur TicketHub !</p>
  `)

  return sendEmail({
    to: user.email,
    subject: '✦ Bienvenue sur TicketHub !',
    html,
  })
}

export async function sendPaymentFailedEmail({ user, order }) {
  const html = baseTemplate(`
    <h1>Paiement <span style="color:#C0392B;">non traité</span></h1>
    <p>Bonjour <strong>${user.name}</strong>,</p>
    <p>Votre paiement pour la commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> n'a pas pu être traité.</p>
    <p>Veuillez réessayer ou utiliser un autre moyen de paiement.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Réessayer</a>
    <p>Si le problème persiste, contactez notre support.</p>
  `)

  return sendEmail({
    to: user.email,
    subject: '⚠️ Problème de paiement — TicketHub',
    html,
  })
}
