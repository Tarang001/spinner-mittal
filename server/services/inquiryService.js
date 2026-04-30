import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { Resend } from "resend";

// initialize resend
const resend = new Resend(env.RESEND_API_KEY);

export async function createInquiry({ name, email, message }) {
  // 1. Save to DB
  const inquiry = await prisma.inquiry.create({
    data: {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      message: String(message).trim(),
    },
  });

  // 2. Send email (non-blocking, no SMTP issues)
  resend.emails
    .send({
      from: "onboarding@resend.dev", // default allowed sender
      to: "mrinalini070705@gmail.com",
      subject: "New Inquiry from Mittal Spinners Website",
      text: `Name: ${String(name).trim()}
Email: ${String(email).trim()}
Message: ${String(message).trim()}`,
    })
    .then(() => {
      logger.email("sent", "Inquiry email delivered");
    })
    .catch((err) => {
      logger.email("failed", err?.message || String(err));
    });

  // 3. Return immediately (fast UI)
  return inquiry;
}
