// File: backend/emailService.js
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit"); // <-- NEW: Import pdfkit

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// NEW: Function to generate a simple PDF invoice in memory
function generateInvoicePDF(purchaseDetails) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // --- PDF Content ---
    // Helper function for date formatting
    const formatDateTime = (date) =>
      new Date(date).toLocaleString("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
      });

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Booking Invoice", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Booking ID: ${Math.round(Math.random() * 100000)}`, {
        align: "center",
      });
    doc.moveDown(2);

    // Passenger Info
    doc.fontSize(14).font("Helvetica-Bold").text("Passenger Details");
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Email: ${purchaseDetails.userEmail}`);
    doc.moveDown();

    // Trip Details
    doc.fontSize(14).font("Helvetica-Bold").text("Trip Details");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Bus: ${purchaseDetails.trip.busName}`);
    doc.text(
      `Route: ${purchaseDetails.trip.source} to ${purchaseDetails.trip.destination}`
    );
    doc.text(
      `Departure: ${formatDateTime(purchaseDetails.trip.departureTime)}`
    );
    doc.text(`Arrival: ${formatDateTime(purchaseDetails.trip.arrivalTime)}`);
    doc.moveDown();

    // Booking Summary
    doc.fontSize(14).font("Helvetica-Bold").text("Booking Summary");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Seats Booked: ${purchaseDetails.seatNumbers.join(", ")}`);
    doc.moveDown(2);

    // Total Price
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(`Total Amount Paid: ₹${purchaseDetails.totalPrice.toFixed(2)}`, {
        align: "right",
      });

    // Footer
    doc
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text("Thank you for booking with us!", 50, 700, {
        align: "center",
        width: 500,
      });

    doc.end();
  });
}

async function sendPurchaseConfirmation(userEmail, purchaseDetails) {
  try {
    // NEW: Generate the PDF first
    const invoicePdf = await generateInvoicePDF({
      ...purchaseDetails,
      userEmail,
    });

    const mailOptions = {
      from: `"Bus Ticketing" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Booking Confirmation for ${purchaseDetails.routeName}`,
      html: `
        <h1>Your Booking is Confirmed!</h1>
        <p>Thank you for your purchase. Your invoice is attached.</p>
      `,
      // NEW: Add the attachments array
      attachments: [
        {
          filename: "invoice.pdf",
          content: invoicePdf,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Confirmation email with PDF invoice sent successfully.");
  } catch (error) {
    console.error("❌ Error sending confirmation email with PDF:", error);
  }
}

module.exports = { sendPurchaseConfirmation };
