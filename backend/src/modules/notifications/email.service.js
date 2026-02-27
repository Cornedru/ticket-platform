const sendEmail = async ({ to, subject, html }) => {
  console.log(`[EMAIL] Sending to: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body preview: ${html.substring(0, 100)}...`);
  return { success: true, messageId: `mock-${Date.now()}` };
};

const sendOrderConfirmation = async (user, order, tickets) => {
  const event = order.event;
  const subject = `Confirmation de votre commande - ${event.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF00FF;">🎫 TRIP - Confirmation de commande</h1>
      <p>Bonjour ${user.name},</p>
      <p>Votre commande a été confirmée !</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h2 style="margin-top: 0;">${event.title}</h2>
        <p><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>📍 Lieu:</strong> ${event.location}</p>
        <p><strong>🎟️ Billets:</strong> ${order.quantity}</p>
        <p><strong>💰 Total:</strong> ${order.totalPrice.toFixed(2)}€</p>
      </div>
      
      <p>Vos billets sont disponibles dans votre espace membre.</p>
      <p>Merci d'utiliser TRIP !</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        © 2026 TRIP - Plateforme de billetterie<br>
        support@trip.example.com
      </p>
    </div>
  `;
  
  return sendEmail({ to: user.email, subject, html });
};

const sendTicketTransfer = async (fromUser, toEmail, ticket, event) => {
  const subject = `Vous avez reçu un billet - ${event.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF00FF;">🎫 TRIP - Nouveau billet</h1>
      <p>Bonjour,</p>
      <p>${fromUser.name} vous a transféré un billet !</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h2 style="margin-top: 0;">${event.title}</h2>
        <p><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>📍 Lieu:</strong> ${event.location}</p>
      </div>
      
      <p>Connectez-vous à votre compte TRIP pour voir vos billets.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        © 2026 TRIP - Plateforme de billetterie
      </p>
    </div>
  `;
  
  return sendEmail({ to: toEmail, subject, html });
};

export { sendEmail, sendOrderConfirmation, sendTicketTransfer };
