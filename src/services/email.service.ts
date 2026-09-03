import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export interface OrderEmailData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryArea: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA' | string;
  shippingAddress: string;
  city: string;
  notes?: string | null;
  subtotal: any;
  shippingFee: any;
  discountAmount: any;
  totalAmount: any;
  paymentMethod: 'COD' | 'BKASH' | string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | string;
  paymentSenderNumber?: string | null;
  paymentTrxId?: string | null;
  createdAt: Date | string;
  items: Array<{
    productName: string;
    scaleRatio?: string | null;
    quantity: number;
    unitPrice: any;
    totalPrice: any;
    image?: string | null;
  }>;
}

/**
 * Creates nodemailer transport dynamically from StoreSettings or .env
 */
async function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }

  return null;
}

/**
 * Sends Order Notification to the Admin's configured email address
 */
export async function sendAdminOrderAlert(order: OrderEmailData) {
  try {
    // 1. Fetch configured notification email from StoreSettings
    const setting = await prisma.storeSetting.findUnique({
      where: { key: 'admin_notification_email' }
    });
    const recipientEmail = setting?.value || process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@speedscalegarage.com';

    const isBkash = order.paymentMethod === 'BKASH';
    const subtotalFormatted = Number(order.subtotal).toLocaleString();
    const shippingFeeFormatted = Number(order.shippingFee).toLocaleString();
    const discountFormatted = Number(order.discountAmount).toLocaleString();
    const totalFormatted = Number(order.totalAmount).toLocaleString();

    // 2. Build HTML Content with SpeedScale dark aesthetics
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #27272a;">
        <td style="padding: 12px 8px; color: #ffffff; font-weight: bold; font-size: 13px;">
          ${item.productName} ${item.scaleRatio ? `<span style="color: #ec4899; font-size: 11px;">(${item.scaleRatio})</span>` : ''}
        </td>
        <td style="padding: 12px 8px; color: #a1a1aa; text-align: center; font-size: 13px;">x${item.quantity}</td>
        <td style="padding: 12px 8px; color: #ffffff; text-align: right; font-family: monospace; font-size: 13px;">৳${Number(item.totalPrice).toLocaleString()}</td>
      </tr>
    `).join('');

    const bkashAlertBox = isBkash ? `
      <div style="background: linear-gradient(135deg, rgba(219, 39, 119, 0.15), rgba(147, 51, 234, 0.15)); border: 2px solid #db2777; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="background-color: #db2777; color: white; font-weight: bold; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">bKash Send Money Verification</span>
        </div>
        <p style="margin: 6px 0 2px 0; color: #f472b6; font-size: 12px; text-transform: uppercase; font-weight: 600;">Transaction ID (TrxID):</p>
        <p style="margin: 0; color: #ffffff; font-size: 20px; font-family: monospace; font-weight: bold; letter-spacing: 1.5px;">${order.paymentTrxId || 'NOT_PROVIDED'}</p>
        
        <p style="margin: 12px 0 2px 0; color: #a1a1aa; font-size: 12px;">Customer Sender bKash Number:</p>
        <p style="margin: 0; color: #ffffff; font-size: 15px; font-family: monospace; font-weight: bold;">${order.paymentSenderNumber || 'NOT_PROVIDED'}</p>
        
        <p style="margin: 12px 0 0 0; color: #fbcfe8; font-size: 12px;">Expected Amount: <strong style="color: #ffffff; font-size: 14px;">৳${totalFormatted}</strong></p>
      </div>
    ` : `
      <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <span style="background-color: #7c3aed; color: white; font-weight: bold; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">Cash on Delivery (COD)</span>
        <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 12px;">Collect <strong style="color: #ffffff;">৳${totalFormatted}</strong> upon delivery to customer.</p>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #e4e4e7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #121215; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <div style="background-color: #18181b; border-bottom: 1px solid #27272a; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">SPEEDSCALE GARAGE</h1>
            <p style="margin: 4px 0 0 0; color: #db2777; font-size: 12px; font-weight: 700; text-transform: uppercase;">New Order Received • ${order.orderNumber}</p>
          </div>

          <div style="padding: 24px;">
            ${bkashAlertBox}

            <!-- Customer & Delivery Details -->
            <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Customer & Delivery Details</h3>
              <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #ffffff;">Name:</strong> ${order.customerName}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #ffffff;">Phone:</strong> <a href="tel:${order.customerPhone}" style="color: #38bdf8; text-decoration: none;">${order.customerPhone}</a></p>
              <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #ffffff;">Email:</strong> ${order.customerEmail}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #ffffff;">Delivery Area:</strong> ${order.deliveryArea === 'INSIDE_DHAKA' ? 'Inside Dhaka Metro (৳' + shippingFeeFormatted + ')' : 'Outside Dhaka (৳' + shippingFeeFormatted + ')'}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong style="color: #ffffff;">Address:</strong> ${order.shippingAddress}, ${order.city}</p>
              ${order.notes ? `<p style="margin: 4px 0; font-size: 13px;"><strong style="color: #ffffff;">Notes:</strong> ${order.notes}</p>` : ''}
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 1px solid #3f3f46; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 8px; text-align: left;">Model</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Financial Summary -->
            <div style="border-top: 1px solid #27272a; padding-top: 12px; margin-bottom: 24px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #a1a1aa;">Subtotal:</span>
                <span style="color: #ffffff; font-family: monospace;">৳${subtotalFormatted}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #a1a1aa;">Delivery Fee:</span>
                <span style="color: #ffffff; font-family: monospace;">৳${shippingFeeFormatted}</span>
              </div>
              ${Number(order.discountAmount) > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #db2777;">Discount:</span>
                <span style="color: #db2777; font-family: monospace;">-৳${discountFormatted}</span>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #3f3f46; font-size: 16px; font-weight: bold;">
                <span style="color: #ffffff;">Total Amount:</span>
                <span style="color: #db2777; font-family: monospace;">৳${totalFormatted}</span>
              </div>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin-top: 24px;">
              <a href="${env.FRONTEND_URL}/admin/orders" style="display: inline-block; background-color: #db2777; color: #ffffff; font-weight: bold; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 10px; text-transform: uppercase;">Manage Order in Admin Portal</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #18181b; border-top: 1px solid #27272a; padding: 16px; text-align: center; font-size: 11px; color: #71717a;">
            SpeedScale Garage Bangladesh • Automated Dispatch Alert
          </div>
        </div>
      </body>
      </html>
    `;

    const transporter = await getTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"SpeedScale Garage" <orders@speedscalegarage.com>',
        to: recipientEmail,
        subject: `[NEW ORDER] ${order.orderNumber} - ${order.paymentMethod === 'BKASH' ? '⚡ bKash Payment (TrxID: ' + order.paymentTrxId + ')' : '📦 Cash on Delivery'}`,
        html
      });
      console.log(`✉️  Admin order alert email dispatched to ${recipientEmail}`);
    } else {
      console.log(`✉️  [SIMULATED EMAIL] Admin order alert generated for ${recipientEmail}: Order ${order.orderNumber} (${order.paymentMethod})`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to dispatch admin order email:', error);
    return { success: false, error };
  }
}

/**
 * Sends Customer Order Confirmation Receipt
 */
export async function sendCustomerOrderReceipt(order: OrderEmailData) {
  try {
    const isBkash = order.paymentMethod === 'BKASH';
    const totalFormatted = Number(order.totalAmount).toLocaleString();

    const transporter = await getTransporter();
    if (!transporter) {
      console.log(`✉️  [SIMULATED EMAIL] Customer receipt generated for ${order.customerEmail}: Order ${order.orderNumber}`);
      return { success: true, simulated: true };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="background-color: #09090b; font-family: sans-serif; padding: 24px; color: #e4e4e7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #121215; border: 1px solid #27272a; border-radius: 16px; padding: 24px;">
          <h2 style="color: #ffffff; margin-top: 0;">Thank you for your order, ${order.customerName}!</h2>
          <p style="color: #a1a1aa; font-size: 13px;">Your order <strong style="color: #db2777;">${order.orderNumber}</strong> has been received and is being prepared at SpeedScale Garage.</p>
          
          <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Payment Method:</strong> ${isBkash ? 'bKash Send Money' : 'Cash on Delivery'}</p>
            ${isBkash ? `<p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Transaction ID:</strong> <span style="font-family: monospace; color: #f472b6;">${order.paymentTrxId}</span></p>` : ''}
            <p style="margin: 0; font-size: 13px;"><strong>Total Payable:</strong> ৳${totalFormatted}</p>
          </div>

          <p style="color: #71717a; font-size: 12px; margin-top: 24px;">Expected Delivery: 24-48 hours within Dhaka Metro, 3-5 days outside Dhaka.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SpeedScale Garage" <orders@speedscalegarage.com>',
      to: order.customerEmail,
      subject: `Order Confirmed: ${order.orderNumber} • SpeedScale Garage`,
      html
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to dispatch customer receipt email:', error);
    return { success: false, error };
  }
}
