const nodemailer = require('nodemailer');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

let transporter = null;

function isMailConfigured() {
    return Boolean(config.mail.user && config.mail.pass && config.mail.from);
}

function getTransporter() {
    if (!isMailConfigured()) {
        throw ApiError.internal('He thong chua duoc cau hinh email gui ma xac minh');
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.secure,
            auth: {
                user: config.mail.user,
                pass: config.mail.pass
            }
        });
    }

    return transporter;
}

function formatCurrency(amount = 0) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(Number(amount || 0));
}

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function maskEmail(email = '') {
    const [name, domain] = String(email || '').split('@');
    if (!name || !domain) return email;
    if (name.length <= 3) return `${name[0] || ''}***@${domain}`;
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 3, 3))}${name.slice(-1)}@${domain}`;
}

async function sendPaymentVerificationEmail({
    to,
    verificationCode,
    orderNumber,
    amount,
    expiryMinutes
}) {
    const transport = getTransporter();
    const safeOrderNumber = escapeHtml(orderNumber || 'Chua xac dinh');
    const safeCode = escapeHtml(verificationCode || '');
    const safeAmount = escapeHtml(formatCurrency(amount));
    const safeExpiryMinutes = escapeHtml(String(expiryMinutes || config.mail.verificationExpiryMinutes));

    const text = [
        'Kinh gui Quy khach,',
        '',
        'PetNest da ghi nhan yeu cau thanh toan cho don hang cua Quy khach.',
        '',
        `Ma xac minh thanh toan cua Quy khach la: ${verificationCode}`,
        '',
        `Vui long nhap ma nay de hoan tat giao dich. Ma xac minh chi co hieu luc trong ${expiryMinutes} phut.`,
        '',
        'Luu y quan trong:',
        '- Khong chia se ma xac minh nay cho bat ky ai.',
        '- PetNest khong bao gio yeu cau Quy khach cung cap ma xac minh qua dien thoai, tin nhan hoac mang xa hoi.',
        '- Neu Quy khach khong thuc hien giao dich nay, vui long bo qua email hoac lien he ngay voi bo phan ho tro cua PetNest.',
        '',
        'Thong tin don hang:',
        `- Ma don hang: ${orderNumber}`,
        `- Tong thanh toan: ${formatCurrency(amount)}`,
        '',
        'Tran trong,',
        'PetNest'
    ].join('\n');

    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;padding:24px;background:#ffffff">
            <p>Kính gửi Quý khách,</p>
            <p>PetNest đã ghi nhận yêu cầu thanh toán cho đơn hàng của Quý khách.</p>
            <p><strong>Mã xác minh thanh toán của Quý khách là: ${safeCode}</strong></p>
            <p>Vui lòng nhập mã này để hoàn tất giao dịch. Mã xác minh chỉ có hiệu lực trong <strong>${safeExpiryMinutes} phút</strong>.</p>
            <p><strong>Lưu ý quan trọng:</strong></p>
            <ul>
                <li>Không chia sẻ mã xác minh này cho bất kỳ ai.</li>
                <li>PetNest không bao giờ yêu cầu Quý khách cung cấp mã xác minh qua điện thoại, tin nhắn hoặc mạng xã hội.</li>
                <li>Nếu Quý khách không thực hiện giao dịch này, vui lòng bỏ qua email hoặc liên hệ ngay với bộ phận hỗ trợ của PetNest.</li>
            </ul>
            <p><strong>Thông tin đơn hàng:</strong></p>
            <ul>
                <li>Mã đơn hàng: ${safeOrderNumber}</li>
                <li>Tổng thanh toán: ${safeAmount}</li>
            </ul>
            <p>Trân trọng,<br><strong>PetNest</strong></p>
        </div>
    `;

    await transport.sendMail({
        from: config.mail.from,
        to,
        subject: `[PetNest] Ma xac minh thanh toan cho don ${orderNumber}`,
        text,
        html
    });

    return {
        sentTo: to,
        maskedEmail: maskEmail(to)
    };
}

async function sendPasswordResetCodeEmail({
    to,
    name,
    verificationCode,
    expiryMinutes
}) {
    const transport = getTransporter();
    const safeName = escapeHtml(name || 'Quý khách');
    const safeCode = escapeHtml(verificationCode || '');
    const safeExpiryMinutes = escapeHtml(String(expiryMinutes || config.mail.passwordResetExpiryMinutes));

    const text = [
        `Kinh gui ${name || 'Quy khach'},`,
        '',
        'PetNest da ghi nhan yeu cau dat lai mat khau cho tai khoan cua Quy khach.',
        '',
        `Ma xac minh dat lai mat khau cua Quy khach la: ${verificationCode}`,
        '',
        `Vui long nhap ma nay de tiep tuc dat lai mat khau. Ma xac minh chi co hieu luc trong ${expiryMinutes} phut va chi duoc su dung mot lan.`,
        '',
        'Luu y quan trong:',
        '- Khong chia se ma xac minh nay cho bat ky ai.',
        '- PetNest khong bao gio yeu cau Quy khach cung cap ma xac minh qua dien thoai, tin nhan hoac mang xa hoi.',
        '- Neu Quy khach khong yeu cau dat lai mat khau, vui long bo qua email nay va doi mat khau neu thay co dau hieu bat thuong.',
        '',
        'Tran trong,',
        'PetNest'
    ].join('\n');

    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;padding:24px;background:#ffffff">
            <p>Kính gửi ${safeName},</p>
            <p>PetNest đã ghi nhận yêu cầu đặt lại mật khẩu cho tài khoản của Quý khách.</p>
            <p><strong>Mã xác minh đặt lại mật khẩu của Quý khách là: ${safeCode}</strong></p>
            <p>Vui lòng nhập mã này để tiếp tục đặt lại mật khẩu. Mã xác minh chỉ có hiệu lực trong <strong>${safeExpiryMinutes} phút</strong> và chỉ được sử dụng một lần.</p>
            <p><strong>Lưu ý quan trọng:</strong></p>
            <ul>
                <li>Không chia sẻ mã xác minh này cho bất kỳ ai.</li>
                <li>PetNest không bao giờ yêu cầu Quý khách cung cấp mã xác minh qua điện thoại, tin nhắn hoặc mạng xã hội.</li>
                <li>Nếu Quý khách không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đổi mật khẩu nếu thấy có dấu hiệu bất thường.</li>
            </ul>
            <p>Trân trọng,<br><strong>PetNest</strong></p>
        </div>
    `;

    await transport.sendMail({
        from: config.mail.from,
        to,
        subject: '[PetNest] Mã xác minh đặt lại mật khẩu',
        text,
        html
    });

    return {
        sentTo: to,
        maskedEmail: maskEmail(to)
    };
}

module.exports = {
    isMailConfigured,
    maskEmail,
    sendPaymentVerificationEmail,
    sendPasswordResetCodeEmail
};
