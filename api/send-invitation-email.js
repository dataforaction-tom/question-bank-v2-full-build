// api/send-invitation-email.js

import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, text } = req.body;

  const msg = {
    to,
    from: 'tom.watson@dataforaction.org.uk', // Use the email address or domain you verified with SendGrid
    subject,
    text,
    html: `<p>${text}</p>`,
  };

  try {
    await sendgrid.send(msg);
    return res.status(200).json({ message: 'Email sent' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Error sending email' });
  }
}
