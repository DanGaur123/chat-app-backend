const sgMail = require("@sendgrid/mail")
const dotenv = require("dotenv")

dotenv.config({path:"../config.env"})

sgMail.setApiKey(process.env.SG_KEY)

const sendSGMail = async ({ to, sender, subject,html,text, attachments }) => {
    try {
        const from = sender || "contact@chatify.com"
        const msg = {
            to: to,
            from: from,
            subject,
            html: html,
            text:text,
            attachments
        }
        return await sgMail.send(msg)
    } catch (error) {
        console.log(error)
    }
}

exports.sendMail = async (args) => {
   if (!process.env.NODE_ENV === "development") {
     return new Promise.resolve()
   } else {
    return await sendSGMail(args)
   }
}