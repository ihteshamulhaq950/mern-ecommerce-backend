import Mailgen from "mailgen";
import nodemailer, { SendMailOptions } from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection/index.js";



// Interface for options passed to sendEmail function
interface ISendEmailOptions {
    to: SendMailOptions["to"];
    subject: SendMailOptions["subject"];
    mailgenContent: Mailgen.ContentBody | Mailgen.Content;
}

// Function to send email
const sendEmail = async (options: ISendEmailOptions) => {

    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Ecommerce App",
            link: "https://ecommerce-app.com",

        },
    });


    // Generate the plaintext version of the email (for clients that do not support HTML)
    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent as Mailgen.Content);

    // Generate an HTML email with the provides contents
    const emailHtml = mailGenerator.generate(options.mailgenContent as Mailgen.Content)


    // Create transporter using SMTP settings
    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS,
        },
    } as SMTPConnection.Options);

    // Define email options
    const mail = {
        from: "amir@gmail.com",
        to: options.to,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
    };


    try {
        // Send email using nodemailer transporter
        await transporter.sendMail(mail);
        console.log("Email sent successfully!");

    } catch (error: any) {
        console.log("Email sending failed Please check your credentials in the environment variables.");
        console.log("Error:", error);

    }
};


// Function to generate mailgen content for email verification
const emailVerificationMailgenContent = (username: string, verificationUrl: string): Mailgen.Content => {

    return {
        body: {
            name: username,
            intro: "Wellcome to our app! We are very excited to have you on board.",
            action: {
                instructions: "To verify your email please click on the following button:",
                button: {
                    color: "#22BC66",
                    text: "Verify Email",
                    link: verificationUrl,
                },
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
        },

    }
};


// Function to generate mailgen content for forgot password
const forgotPasswordMailgenContent = (username: string, passwordResetUrl: string): Mailgen.Content => {
    return {
        body: {
            name: username,
            intro: "We got a request to reset the password of your account.",
            action: {
                instructions: "To reset your password click on the following button:",
                button: {
                    color: "#22BC66",
                    text: "Reset Password",
                    link: passwordResetUrl,
                },
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help.",

        }
    };
};


export {
    sendEmail,
    emailVerificationMailgenContent,
    forgotPasswordMailgenContent
};



