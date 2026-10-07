import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use express JSON middleware
  app.use(express.json());

  // API Route for sending welcome email
  app.post('/api/send-welcome-email', async (req, res) => {
    const { email, accountName } = req.body;

    if (!email || !accountName) {
      return res.status(400).json({ error: 'Email and accountName are required' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set. Email not sent, returning simulated success.");
      return res.status(200).json({ status: 'simulated' });
    }

    const resend = new Resend(apiKey);

    try {
      const data = await resend.emails.send({
        from: 'Saposa Enterprise <onboarding@resend.dev>', // resend.dev for testing, should use real domain for production
        to: email,
        subject: 'Welcome to Saposa Agricultural Platform!',
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <h1 style="color: #00A86B;">Welcome to Saposa!</h1>
            <p>Hi ${accountName},</p>
            <p>Thank you for registering on the Saposa Agricultural Platform. We are thrilled to have you join our community of agricultural investors.</p>
            <p>With Saposa, you can invest in high-yield agricultural packages like Snail, Fish, and Poultry farming, ensuring solid returns and contributing to food security.</p>
            <p>Log in to your dashboard to explore our latest investment opportunities and start growing your portfolio today.</p>
            <br/>
            <p>Best regards,</p>
            <p>The Saposa Team</p>
            <p><small>saposaenterprise@gmail.com</small></p>
          </div>
        `
      });

      res.status(200).json(data);
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // API Route for sending contact message
  app.post('/api/send-contact-message', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set. Contact email not sent, returning simulated success.");
      return res.status(200).json({ status: 'simulated' });
    }

    const resend = new Resend(apiKey);

    try {
      const data = await resend.emails.send({
        from: 'Saposa Contact Form <onboarding@resend.dev>', // resend.dev for testing, should use real domain for production
        to: 'saposaenterprise@gmail.com',
        replyTo: email,
        subject: `New Contact Message from ${name}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <h2>New message from the website contact form</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <hr />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        `
      });

      res.status(200).json(data);
    } catch (error) {
      console.error('Error sending contact email:', error);
      res.status(500).json({ error: 'Failed to send contact email' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
