const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "mochonam19@gmail.com",
    pass: "utbozhxwkvziadmy",
  },
});

const SENDMAIL = async (mailDetails, callback) => {
  try {
    const info = await transporter.sendMail(mailDetails);
    callback(info);
    console.log(info);
  } catch (error) {
    console.log(error);
  }
};
module.exports = SENDMAIL;
