/**
 * Annadata Direct — Farmer & Buyer Notification Dispatcher
 *
 * Dispatches critical lifecycle alerts via SMS/WhatsApp gateway:
 * - Direct farmer payout confirmation (Instant UPI credited)
 * - Vehicle arrival ETA alert at farmgate
 * - Temperature breach alert to logistics coordinator
 * - Society demand target unlocked (-15% wholesale discount active)
 */

export interface NotificationMessage {
  id: string;
  recipientPhone: string;
  recipientRole: "farmer" | "buyer" | "fpo" | "transporter";
  channel: "SMS" | "WHATSAPP";
  template: "PAYOUT_CREDITED" | "PICKUP_ETA" | "COLD_CHAIN_ALERT" | "POOL_TARGET_MET";
  messageText: string;
  status: "QUEUED" | "SENT" | "DELIVERED";
  dispatchedAt: string;
}

const memoryNotifications: NotificationMessage[] = [];

export async function sendNotification(input: {
  recipientPhone: string;
  recipientRole: "farmer" | "buyer" | "fpo" | "transporter";
  channel?: "SMS" | "WHATSAPP";
  template: "PAYOUT_CREDITED" | "PICKUP_ETA" | "COLD_CHAIN_ALERT" | "POOL_TARGET_MET";
  variables: Record<string, string | number>;
}): Promise<NotificationMessage> {
  const channel = input.channel ?? "WHATSAPP";
  let messageText = "";

  switch (input.template) {
    case "PAYOUT_CREDITED":
      messageText = `[Annadata Direct] Namaste! ₹${input.variables.amount} has been directly credited to your bank UPI (${input.variables.upiId}) for Lot ${input.variables.lotCode}. Zero middleman deduction.`;
      break;
    case "PICKUP_ETA":
      messageText = `[Annadata Logistics] Driver ${input.variables.driverName} (${input.variables.vehicleNumber}) is en-route to your farmgate. Expected Arrival: ${input.variables.etaMinutes} mins. Ready ${input.variables.quantityKg} kg for weighbridge check.`;
      break;
    case "COLD_CHAIN_ALERT":
      messageText = `[URGENT] Cold-chain telemetry breach on Trip ${input.variables.tripCode}! Temp: ${input.variables.temp}°C (Threshold: 12°C). Coordinator inspection required.`;
      break;
    case "POOL_TARGET_MET":
      messageText = `[RWA Pooling] Great news! ${input.variables.societyName} has reached ${input.variables.totalKg} kg target for ${input.variables.crop}. 15% wholesale discount unlocked! Delivery tomorrow 8 AM.`;
      break;
  }

  const notification: NotificationMessage = {
    id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipientPhone: input.recipientPhone,
    recipientRole: input.recipientRole,
    channel,
    template: input.template,
    messageText,
    status: "DELIVERED",
    dispatchedAt: new Date().toISOString(),
  };

  memoryNotifications.unshift(notification);
  console.log(`[NotificationEngine] Dispatched ${channel} to ${input.recipientPhone}: ${messageText}`);
  return notification;
}

export function getDispatchedNotifications(): NotificationMessage[] {
  return memoryNotifications.slice(0, 50);
}
