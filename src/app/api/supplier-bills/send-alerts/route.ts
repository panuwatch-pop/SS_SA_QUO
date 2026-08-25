import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_name, days_ahead = 7, target_email } = body;

    // 1. Fetch unpaid supplier bills
    const { data: bills, error: billsError } = await supabase
      .from('supplier_bills')
      .select('*, suppliers(name, code, bank_name, bank_account_no, bank_account_name)')
      .eq('company_name', company_name || 'SST')
      .neq('status', 'paid')
      .order('due_date', { ascending: true });

    if (billsError) throw billsError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date();
    targetDate.setDate(today.getDate() + Number(days_ahead));

    // Filter bills: overdue or due within days_ahead
    const dueBills = (bills || []).filter(b => {
      const d = new Date(b.due_date);
      return d <= targetDate;
    });

    if (dueBills.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `ไม่พบรายการบิลที่ครบกำหนดชำระภายใน ${days_ahead} วันข้างหน้า` 
      });
    }

    // 2. Determine receiver email
    const recipientEmail = target_email || (company_name === 'Shinwa Anzen' ? process.env.SHINWA_GMAIL_USER : process.env.SST_GMAIL_USER);
    if (!recipientEmail) {
      return NextResponse.json({ error: 'ไม่พบบัญชีอีเมลผู้รับสำหรับแผนกบัญชี' }, { status: 400 });
    }

    // 3. Nodemailer Setup
    let user, pass;
    if (company_name === 'Shinwa Anzen') {
      user = process.env.SHINWA_GMAIL_USER;
      pass = process.env.SHINWA_GMAIL_APP_PASSWORD;
    } else {
      user = process.env.SST_GMAIL_USER;
      pass = process.env.SST_GMAIL_APP_PASSWORD;
    }

    if (!user || !pass) {
      return NextResponse.json({ error: 'ไม่ได้ตั้งค่าการส่งอีเมลสำหรับบริษัทนี้' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    // 4. Calculate total amount due
    const totalDueAmount = dueBills.reduce((sum, b) => sum + Number(b.net_amount || 0), 0);

    // 5. Generate HTML Email Content
    const rowsHtml = dueBills.map((b, index) => {
      const d = new Date(b.due_date);
      const isOverdue = d < today;
      const daysDiff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      let dueBadge = `<span style="color: #059669; font-weight: bold;">อีก ${daysDiff} วัน</span>`;
      if (daysDiff === 0) dueBadge = `<span style="color: #d97706; font-weight: bold;">ครบกำหนดวันนี้</span>`;
      if (isOverdue) dueBadge = `<span style="color: #dc2626; font-weight: bold;">เกินกำหนด ${Math.abs(daysDiff)} วัน</span>`;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-align: center;">${index + 1}</td>
          <td style="padding: 10px;">
            <strong>${b.suppliers?.name || 'ไม่ระบุ'}</strong>
            <div style="font-size: 12px; color: #64748b;">บิลเลขที่: ${b.bill_number}</div>
          </td>
          <td style="padding: 10px; font-size: 13px;">
            ${b.suppliers?.bank_name || '-'} ${b.suppliers?.bank_account_no || ''}
            <div style="font-size: 11px; color: #64748b;">(${b.suppliers?.bank_account_name || b.suppliers?.name || ''})</div>
          </td>
          <td style="padding: 10px; text-align: center; font-size: 13px;">
            ${new Date(b.due_date).toLocaleDateString('th-TH')}
            <div>${dueBadge}</div>
          </td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #002266; font-size: 14px;">
            ฿${Number(b.net_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    }).join('');

    const emailHtml = `
      <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #002266; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #002266; margin: 0;">แจ้งเตือนยอดครบกำหนดจ่ายเงิน Supplier (${company_name})</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">รายงานบิลเจ้าหนี้ที่ต้องชำระภายใน ${days_ahead} วันข้างหน้า และบิลค้างชำระ</p>
        </div>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #002266;">
          <div style="font-size: 14px; color: #64748b;">ยอดรวมที่ต้องเตรียมจ่ายทั้งหมด:</div>
          <div style="font-size: 24px; font-weight: bold; color: #002266; margin-top: 4px;">
            ฿${totalDueAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
          </div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">จำนวน ${dueBills.length} รายการ</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
          <thead>
            <tr style="background-color: #002266; color: #ffffff;">
              <th style="padding: 10px; width: 5%; text-align: center;">#</th>
              <th style="padding: 10px; width: 35%;">ซัพพลายเออร์ / เลขที่บิล</th>
              <th style="padding: 10px; width: 25%;">บัญชีรับโอนเงิน</th>
              <th style="padding: 10px; width: 20%; text-align: center;">วันครบกำหนด</th>
              <th style="padding: 10px; width: 15%; text-align: right;">ยอดเงิน</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          ข้อความนี้ส่งอัตโนมัติจากระบบจัดการการจัดซื้อและใบเสนอราคา ${company_name}
        </div>
      </div>
    `;

    // 6. Send Mail
    await transporter.sendMail({
      from: `"ระบบแจ้งเตือนเจ้าหนี้ ${company_name}" <${user}>`,
      to: recipientEmail,
      subject: `[แจ้งเตือนครบกำหนดจ่ายเงิน Supplier] ยอดรวม ฿${totalDueAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${company_name})`,
      html: emailHtml,
    });

    return NextResponse.json({ 
      success: true, 
      count: dueBills.length, 
      totalAmount: totalDueAmount 
    });

  } catch (error: any) {
    console.error('Error sending AP alerts:', error);
    return NextResponse.json({ error: error.message || 'Failed to send alert' }, { status: 500 });
  }
}
