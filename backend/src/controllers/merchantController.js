import User from "../models/User.js";
import Ticket from "../models/Ticket.js";
import Notification from "../models/Notification.js";

// Helper function to return safe user object
function toSafeUser(user) {
  let mStatus = user.merchantStatus;
  if (user.role === "merchant" && !mStatus) {
    if (user.merchantDetails && user.merchantDetails.businessName) {
      mStatus = user.quotationAmount > 0 ? "quotation_sent" : "details_submitted";
    } else {
      mStatus = "details_pending";
    }
  }
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mobile: user.mobile,
    merchantStatus: mStatus,
    merchantDetails: user.merchantDetails,
    quotationAmount: user.quotationAmount,
    maxEvents: user.maxEvents,
    maxServices: user.maxServices,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Helper to notify all admins
async function notifyAdmins(title, message, relatedId, actionUrl) {
  try {
    const admins = await User.find({ role: "admin" });
    const promises = admins.map(admin => {
      return Notification.create({
        userId: admin._id,
        title,
        message,
        type: "general",
        relatedId,
        actionUrl
      });
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}

// Helper to notify a specific user
async function notifyUser(userId, title, message, relatedId, actionUrl) {
  try {
    await Notification.create({
      userId,
      title,
      message,
      type: "general",
      relatedId,
      actionUrl
    });
  } catch (err) {
    console.error("Failed to notify user:", err);
  }
}

// 1. Merchant: Submit onboarding details
export const submitDetails = async (req, res) => {
  try {
    const { businessName, businessDescription, eventTypes, serviceTypes, experienceYears, address } = req.body || {};
    
    if (!businessName || !businessDescription || !address) {
      return res.status(400).json({ error: "Business name, description, and address are required" });
    }

    if (businessName.trim().length > 50) {
      return res.status(400).json({ error: "Business name cannot exceed 50 characters" });
    }

    if (businessDescription.trim().length > 1000) {
      return res.status(400).json({ error: "Business description cannot exceed 1000 characters" });
    }

    const exp = Number(experienceYears) || 0;
    if (exp < 0 || exp > 80) {
      return res.status(400).json({ error: "Experience years must be between 0 and 80" });
    }

    if (address.trim().length > 150) {
      return res.status(400).json({ error: "Address cannot exceed 150 characters" });
    }

    const updates = {
      merchantStatus: "details_submitted",
      merchantDetails: {
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        eventTypes: eventTypes || [],
        serviceTypes: serviceTypes || [],
        experienceYears: exp,
        address: address.trim()
      }
    };

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Notify admins
    await notifyAdmins(
      "New Merchant Onboarding Details",
      `Merchant ${user.name} (${user.email}) has submitted onboarding business details.`,
      user._id,
      "/admin-dashboard/users"
    );

    return res.json({ user: toSafeUser(user), message: "Details submitted successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit details" });
  }
};

// 2. Merchant: Pay onboarding quotation
export const payQuotation = async (req, res) => {
  try {
    const { cardNumber, cardholderName } = req.body || {};
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.merchantStatus !== "quotation_sent") {
      return res.status(400).json({ error: "No active quotation to pay" });
    }

    // Simple payment verification mock
    if (!cardNumber || cardNumber.replace(/\s/g, "").length !== 16) {
      return res.status(400).json({ error: "Invalid credit card number" });
    }

    user.merchantStatus = "paid";
    await user.save();

    // Notify admins
    await notifyAdmins(
      "Onboarding Quotation Paid",
      `Merchant ${user.name} has paid their onboarding setup quotation of $${user.quotationAmount || 0}.`,
      user._id,
      "/admin-dashboard/users"
    );

    return res.json({ user: toSafeUser(user), message: "Payment processed successfully. Waiting for activation." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process payment" });
  }
};

// 3. Admin: Send quotation to merchant
export const sendQuotation = async (req, res) => {
  try {
    const { amount } = req.body || {};
    
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 1 || Number(amount) > 1000000) {
      return res.status(400).json({ error: "Valid quotation amount is required (between 1 and 1,000,000)" });
    }

    const updates = {
      quotationAmount: Number(amount),
      merchantStatus: "quotation_sent"
    };

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Notify merchant
    await notifyUser(
      user._id,
      "Onboarding Setup Quotation Received",
      `Admin has sent an onboarding setup quotation of $${amount}. Please complete the payment.`,
      user._id,
      "/merchant-dashboard"
    );

    return res.json({ user: toSafeUser(user), message: "Quotation sent successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to send quotation" });
  }
};

// 4. Admin: Activate merchant
export const activateMerchant = async (req, res) => {
  try {
    const { maxEvents, maxServices } = req.body || {};

    const maxEv = Number(maxEvents) || 0;
    const maxSe = Number(maxServices) || 0;

    if (maxEv < 1 || maxEv > 1000 || maxSe < 1 || maxSe > 1000) {
      return res.status(400).json({ error: "Limits must be between 1 and 1000" });
    }

    const updates = {
      merchantStatus: "active",
      maxEvents: maxEv,
      maxServices: maxSe
    };

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Notify merchant
    await notifyUser(
      user._id,
      "Merchant Account Activated",
      `Congratulations! Your merchant account is now active. Limits: ${user.maxEvents || 5} events and ${user.maxServices || 5} services.`,
      user._id,
      "/merchant-dashboard"
    );

    return res.json({ user: toSafeUser(user), message: "Merchant activated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to activate merchant" });
  }
};

// 5. Merchant: Raise ticket for more events/services
export const raiseTicket = async (req, res) => {
  try {
    const { requestedEvents, requestedServices, message } = req.body || {};

    const reqEv = Number(requestedEvents) || 0;
    const reqSe = Number(requestedServices) || 0;

    if (reqEv < 0 || reqEv > 100 || reqSe < 0 || reqSe > 100) {
      return res.status(400).json({ error: "Requested slots must be between 0 and 100" });
    }

    if (reqEv === 0 && reqSe === 0) {
      return res.status(400).json({ error: "Must request at least one event or service slot limit increase" });
    }

    if (message && message.trim().length > 300) {
      return res.status(400).json({ error: "Explanation message cannot exceed 300 characters" });
    }

    const ticket = await Ticket.create({
      merchant: req.user._id,
      requestedEvents: reqEv,
      requestedServices: reqSe,
      message: message ? message.trim() : "",
      status: "pending"
    });

    // Notify admins
    await notifyAdmins(
      "New Slot Upgrade Request",
      `Merchant ${req.user.name} has raised an upgrade ticket requesting +${reqEv} events and +${reqSe} services.`,
      ticket._id,
      "/admin-dashboard/users"
    );

    return res.status(201).json({ ticket, message: "Ticket raised successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to raise ticket" });
  }
};

// 6. Merchant / Admin: Get tickets
export const getTickets = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "merchant") {
      query.merchant = req.user._id;
    }

    const tickets = await Ticket.find(query)
      .populate("merchant", "name email mobile")
      .sort({ createdAt: -1 });

    return res.json({ tickets });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

// 7. Admin: Send quotation for ticket
export const sendTicketQuotation = async (req, res) => {
  try {
    const { amount } = req.body || {};
    
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 1 || Number(amount) > 1000000) {
      return res.status(400).json({ error: "Valid quotation amount is required (between 1 and 1,000,000)" });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { quotationAmount: Number(amount), status: "quotation_sent" },
      { new: true }
    ).populate("merchant", "name email mobile");

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    // Notify merchant
    await notifyUser(
      ticket.merchant._id,
      "Upgrade Ticket Quotation Received",
      `Admin has quoted $${amount} for your slot upgrade request (+${ticket.requestedEvents} Events, +${ticket.requestedServices} Services).`,
      ticket._id,
      "/merchant-dashboard"
    );

    return res.json({ ticket, message: "Quotation sent for ticket" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to quote ticket" });
  }
};

// 8. Merchant: Pay for ticket quotation
export const payTicket = async (req, res) => {
  try {
    const { cardNumber } = req.body || {};

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (ticket.status !== "quotation_sent") {
      return res.status(400).json({ error: "No active quotation to pay" });
    }

    // Mock payment verification
    if (!cardNumber || cardNumber.replace(/\s/g, "").length !== 16) {
      return res.status(400).json({ error: "Invalid credit card number" });
    }

    ticket.status = "paid";
    ticket.paymentDetails = {
      cardLast4: cardNumber.slice(-4),
      paidAt: new Date()
    };
    await ticket.save();

    // Populate merchant to get name
    const populatedTicket = await Ticket.findById(ticket._id).populate("merchant", "name");

    // Notify admins
    await notifyAdmins(
      "Upgrade Ticket Quotation Paid",
      `Merchant ${populatedTicket.merchant?.name || "Merchant"} has paid the quotation of $${ticket.quotationAmount} for slot upgrades request.`,
      ticket._id,
      "/admin-dashboard/users"
    );

    return res.json({ ticket, message: "Payment processed successfully. Awaiting approval." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to pay for ticket" });
  }
};

// 9. Admin: Approve ticket and increase limits
export const approveTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (ticket.status !== "paid" && ticket.status !== "quotation_sent") {
      return res.status(400).json({ error: "Ticket must be paid before approval" });
    }

    ticket.status = "approved";
    await ticket.save();

    // Upgrade merchant limits
    const merchant = await User.findByIdAndUpdate(ticket.merchant, {
      $inc: {
        maxEvents: ticket.requestedEvents || 0,
        maxServices: ticket.requestedServices || 0
      }
    }, { new: true });

    // Notify merchant
    await notifyUser(
      ticket.merchant,
      "Slot Upgrade Request Approved",
      `Your slot upgrade request has been approved! Your limits have been upgraded to ${merchant.maxEvents} events and ${merchant.maxServices} services.`,
      ticket._id,
      "/merchant-dashboard"
    );

    const updatedTicket = await Ticket.findById(req.params.ticketId).populate("merchant", "name email mobile maxEvents maxServices");

    return res.json({ ticket: updatedTicket, message: "Ticket approved and limits upgraded" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to approve ticket" });
  }
};
