import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, organizationName, inviterName, invitationLink } = req.body;

  const msg = {
    to,
    from: {
      email: 'tom.watson@dataforaction.org.uk',
      name: 'Data for Action'
    },
    template_id: process.env.SENDGRID_INVITATION_TEMPLATE_ID,
    dynamic_template_data: {
      organization_name: organizationName,
      inviter_name: inviterName,
      invitation_link: invitationLink,
      current_year: new Date().getFullYear(),
    }
  };

  try {
    await sendgrid.send(msg);
    return res.status(200).json({ message: 'Email sent' });
  } catch (error) {
    console.error('Error sending email:', error.response ? error.response.body : error);
    return res.status(500).json({ error: 'Error sending email' });
  }
}
