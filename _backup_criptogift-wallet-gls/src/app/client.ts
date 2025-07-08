import { createThirdwebClient } from "thirdweb";
import { ACTIVE_CHAIN } from "@/lib/constants";

const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;  // ← así

if (!clientId) {
  throw new Error("No client ID provided");
}

export const client = createThirdwebClient({
  clientId,
  chain: ACTIVE_CHAIN,
  accountAbstraction: { sponsorGas: true },
});
