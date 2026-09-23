const Notification = require("../models/Notification");

// Small helper so any controller can fire off a notification in one line.
// Example: await notify(userId, "quote_received", "You got a new quote!", { type: "Quote", id: quote._id });
async function notify(userId, type, message, relatedEntity = null) {
  return Notification.create({
    user: userId,
    type,
    message,
    relatedEntity: relatedEntity || { type: null, id: null },
  });
}

module.exports = { notify };
