import { createThirdwebClient } from "thirdweb";

// Get client ID from environment variables
const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID || process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;

if (!clientId) {
  throw new Error("ThirdWeb client ID not found. Please set NEXT_PUBLIC_TW_CLIENT_ID in your environment variables.");
}

export const client = createThirdwebClient({
  clientId: clientId,
});
