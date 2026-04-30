import nodemailer from 'nodemailer'

const port   = Number(process.env.IONOS_SMTP_PORT ?? 587)
const secure = port === 465 || port === 993

export const transporter = nodemailer.createTransport({
  host:   process.env.IONOS_SMTP_HOST,
  port,
  secure,
  auth: {
    user: process.env.IONOS_EMAIL,
    pass: process.env.IONOS_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
})

export async function verifyMailer() {
  return transporter.verify()
}
