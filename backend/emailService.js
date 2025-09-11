// File: backend/emailService.js
const nodemailer = require("nodemailer");

// Create a "transporter" - an object that can send email
// We configure it to use Gmail's servers
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address from .env
    pass: process.env.EMAIL_PASS, // Your Gmail App Password from .env
  },
});

// The function to send the email remains the same
async function sendPurchaseConfirmation(userEmail, purchaseDetails) {
  const { seatNumbers, totalPrice, routeName } = purchaseDetails;

  const mailOptions = {
    from: `"Bus Ticketing" <${process.env.EMAIL_USER}>`, // Sender name and address
    to: userEmail,
    subject: `Booking Confirmation for ${routeName}`,
    html: `
      <h1>Your Booking is Confirmed!</h1>
      <p>Thank you for your purchase.</p>
      <p><strong>Route:</strong> ${routeName}</p>
      <p><strong>Seats:</strong> ${seatNumbers.join(", ")}</p>
      <p><strong>Total Price:</strong> ₹${totalPrice.toFixed(2)}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Confirmation email sent successfully via Nodemailer.");
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
  }
}

module.exports = { sendPurchaseConfirmation };
