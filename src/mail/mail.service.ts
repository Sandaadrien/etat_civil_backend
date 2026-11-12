import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;

    if (!host || !port || !user || !password) {
      throw new Error('SMTP configuration is incomplete.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user,
        pass: password.replace(/\s/g, ''),
      },
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Activation de votre compte citoyen',
        text: `Votre code d'activation est : ${otp}. Il expire dans 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>Activation de votre compte</h2>

            <p>Bonjour,</p>

            <p>
              Vous avez demandé l'activation de votre compte citoyen.
            </p>

            <div style="
              background: #f3f4f6;
              padding: 20px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
            ">
              ${otp}
            </div>

            <p>Ce code expire dans <strong>5 minutes</strong>.</p>

            <p>
              Si vous n'êtes pas à l'origine de cette demande,
              ignorez cet email.
            </p>

            <hr />

            <small>Enrolment Application</small>
          </div>
        `,
      });

      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send OTP email', error);
      throw new InternalServerErrorException(
        'Impossible d envoyer le code de vérification.',
      );
    }
  }

  async verifyConnection(): Promise<boolean> {
    await this.transporter.verify();
    return true;
  }
}
