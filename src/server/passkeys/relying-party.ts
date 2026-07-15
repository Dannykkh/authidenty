import type { RelyingParty } from "./registration-service";

type RelyingPartyEnvironment = {
  nodeEnv?: string;
  rpId?: string;
  origin?: string;
};

export function resolveRelyingParty(
  environment: RelyingPartyEnvironment = {},
): RelyingParty {
  const nodeEnv = environment.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const rpId = environment.rpId ?? process.env.WEBAUTHN_RP_ID;
  const origin = environment.origin ?? process.env.WEBAUTHN_ORIGIN;

  if (nodeEnv === "production" && (!rpId || !origin)) {
    throw new Error("WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN are required in production.");
  }

  const resolvedId = rpId ?? "localhost";
  const resolvedOrigin = origin ?? "http://localhost:3000";
  const originUrl = new URL(resolvedOrigin);
  const matchesRpId =
    originUrl.hostname === resolvedId || originUrl.hostname.endsWith(`.${resolvedId}`);

  if (!matchesRpId) {
    throw new Error("WEBAUTHN_ORIGIN hostname must match the WebAuthn RP ID.");
  }

  if (originUrl.protocol !== "https:" && originUrl.hostname !== "localhost") {
    throw new Error("WebAuthn requires HTTPS outside localhost.");
  }

  return {
    name: "Authidenty",
    id: resolvedId,
    origin: originUrl.origin,
  };
}
