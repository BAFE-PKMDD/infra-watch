interface SMSPayload {
  _sender_id: string;
  _username: string;
  _password: string;
  _mobile: string;
  _message: string;
}

/**
 * Sends an SMS message via the configured SMS gateway.
 *
 * @param mobile - Mobile number, accepts 09XXXXXXXXX or +639XXXXXXXXX; normalized to
 *                 +639XXXXXXXXX for the gateway.
 * @param message - The message content.
 */
export async function sendSMS(mobile: string, message: string): Promise<{ success: boolean; error?: string; data?: unknown; status?: number }> {
  const url = process.env.SMS_API_URL;
  const senderId = process.env.SMS_SENDER_ID;
  const username = process.env.SMS_USERNAME;
  const password = process.env.SMS_PASSWORD;

  if (!url || !senderId || !username || !password) {
    console.error("SMS configuration is missing in environment variables");
    return { success: false, error: "SMS configuration missing" };
  }

  let formattedMobile = mobile;
  if (mobile.startsWith("0")) {
    formattedMobile = "+63" + mobile.substring(1);
  } else if (!mobile.startsWith("+")) {
    formattedMobile = "+" + mobile;
  }

  const payload: SMSPayload = {
    _sender_id: senderId,
    _username: username,
    _password: password,
    _mobile: formattedMobile,
    _message: message,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true, data: result };
    }

    console.error("Failed to send SMS", { mobile: formattedMobile, status: response.status, result });
    return { success: false, error: "Failed to send SMS", status: response.status, data: result };
  } catch (error) {
    console.error("Error occurred while sending SMS", { error: error instanceof Error ? error.message : "UnknownError" });
    return { success: false, error: "An unexpected error occurred" };
  }
}
