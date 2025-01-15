import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, text } = req.body;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #dee2e6;
          }
          .content {
            padding: 20px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2 style="margin: 0; color: #0066cc;">Data for Action</h2>
          </div>
          <div class="content">
            ${text}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Data for Action. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const msg = {
    to,
    from: 'tom.watson@dataforaction.org.uk',
    subject,
    text,
    html: htmlContent,
  };

  try {
    await sendgrid.send(msg);
    return res.status(200).json({ message: 'Email sent' });
  } catch (error) {
    console.error('Error sending email:', error.response ? error.response.body : error);
    return res.status(500).json({ error: 'Error sending email' });
  }
  
}
