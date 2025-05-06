/**
 * Asynchronously sends data to a specified webhook URL.
 *
 * @param webhookUrl The URL of the webhook to send data to.
 * @param data The data to send to the webhook.
 * @returns A promise that resolves when the data is successfully sent to the webhook.
 * @throws Error if sending data to the webhook fails.
 */
export async function sendToWebhook(webhookUrl: string, data: any): Promise<void> {
  console.log(`Sending data to webhook URL: ${webhookUrl}`);
  // For debugging, you can uncomment this, but be careful with sensitive data in logs.
  // console.log('Data to be sent:', JSON.stringify(data, null, 2)); 

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorBody = 'Could not read error body.';
      try {
        errorBody = await response.text(); // Attempt to get text for more detailed errors
      } catch (e) {
        console.warn("Failed to read error body from webhook response", e);
      }
      console.error(`Webhook notification failed. Status: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Webhook request failed with status ${response.status}. Response: ${errorBody}`);
    }

    console.log('Data successfully sent to webhook.');
    // Optionally, you can process the webhook's response if needed
    // const responseData = await response.json(); // if webhook returns JSON
    // console.log('Webhook response:', responseData);

  } catch (error) {
    console.error('Error sending data to webhook:', error);
    if (error instanceof Error) {
      // Re-throw with a more specific message if it's a fetch-related error (e.g., network issue)
      if (error.message.toLowerCase().includes('failed to fetch')) {
           throw new Error(`Network error: Failed to send data to webhook: ${error.message}. Check webhook URL and network connectivity.`);
      }
      throw new Error(`Failed to send data to webhook: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending data to the webhook.');
  }
}
