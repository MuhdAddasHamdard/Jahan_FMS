import "dotenv/config";
import app from "./app";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET must be set to a secret of at least 32 bytes.");
}

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");
if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
}

app.set("trust proxy", trustProxyHops);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});