import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const attachment = formData.get('attachment') as File;
    const company_name = formData.get('company_name') as string;

    console.log('Received email data:', {
      to,
      subject,
      message,
      company_name,
      hasAttachment: !!attachment
    });

    if (!to || !subject) {
      return NextResponse.json({ error: `Missing required fields. to=${to}, subject=${subject}` }, { status: 400 });
    }

    // Select credentials based on company
    let user, pass;
    if (company_name === 'Shinwa Anzen') {
      user = process.env.SHINWA_GMAIL_USER;
      pass = process.env.SHINWA_GMAIL_APP_PASSWORD;
    } else {
      user = process.env.SST_GMAIL_USER;
      pass = process.env.SST_GMAIL_APP_PASSWORD;
    }

    if (!user || !pass) {
      return NextResponse.json({ error: `Email configuration is missing for company: ${company_name || 'SST'}` }, { status: 500 });
    }

    // Set up Nodemailer transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });

    const mailOptions: any = {
      from: `"Quotation System" <${user}>`,
      to,
      subject,
      text: message,
      html: message.replace(/\n/g, '<br>'),
    };

    if (attachment) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      mailOptions.attachments = [
        {
          filename: attachment.name || 'document.pdf',
          content: buffer,
        },
      ];
    }

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
