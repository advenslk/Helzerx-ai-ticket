import { config } from "#config/config";

export class VPSBotClient {
  constructor({ baseUrl = config.vps.apiUrl, token = config.vps.apiToken, timeoutMs = config.vps.timeoutMs } = {}) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  get enabled() {
    return Boolean(this.baseUrl && this.token);
  }

  async request(path, options = {}) {
    if (!this.enabled) throw new Error("VPS bot integration is not configured");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.baseUrl + path, {
        ...options,
        headers: {
          Authorization: "Bearer " + this.token,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "VPS bot returned HTTP " + response.status);
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  health() { return this.request("/v1/agent/health"); }
  plans() { return this.request("/v1/agent/plans"); }
  nodes() { return this.request("/v1/agent/nodes"); }
  operatingSystems() { return this.request("/v1/agent/operating-systems"); }
  createVps(input) { return this.request("/v1/agent/vps", { method: "POST", body: JSON.stringify(input) }); }
  listForUser(userId) { return this.request("/v1/agent/users/" + encodeURIComponent(userId) + "/vps"); }
  getVps(vpsId) { return this.request("/v1/agent/vps/" + encodeURIComponent(vpsId)); }
  action(vpsId, action) { return this.request("/v1/agent/vps/" + encodeURIComponent(vpsId) + "/action", { method: "POST", body: JSON.stringify({ action }) }); }
  stats(vpsId) { return this.request("/v1/agent/vps/" + encodeURIComponent(vpsId) + "/stats"); }
  logs(vpsId) { return this.request("/v1/agent/vps/" + encodeURIComponent(vpsId) + "/logs"); }
}
