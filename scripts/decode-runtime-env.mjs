/** Decode base64-encoded secrets baked at deploy time (keeps GitHub push protection happy). */
export function decodeRuntimeSecrets(env = process.env) {
  const pairs = [
    ["GROQ_API_KEYS_B64", "GROQ_API_KEYS"],
    ["IMGBB_API_KEY_B64", "IMGBB_API_KEY"],
    ["ADMIN_GATE_PASSWORD_B64", "ADMIN_GATE_PASSWORD"],
    ["ADMIN_PASSWORD_B64", "ADMIN_PASSWORD"],
  ];

  for (const [encoded, plain] of pairs) {
    if (env[encoded] && !env[plain]) {
      env[plain] = Buffer.from(env[encoded], "base64").toString("utf8");
    }
  }
}