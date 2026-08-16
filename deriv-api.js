import { DERIV } from "./config.js";

class DerivAPI {
  constructor() {
    this.ws = null;
    this.symbol = "R_50";
    this.subscriptionId = null;
    this.manual = false;
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.listeners = {
      state: new Set(),
      history: new Set(),
      tick: new Set(),
      log: new Set(),
      error: new Set()
    };
  }

  on(type, fn) {
    this.listeners[type]?.add(fn);
    return () => this.listeners[type]?.delete(fn);
  }

  emit(type, data = {}) {
    this.listeners[type]?.forEach(fn => {
      try { fn(data); } catch (error) { console.error(error); }
    });
  }

  setState(state, label = state.toUpperCase()) {
    this.emit("state", { state, label });
  }

  send(payload) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  connect(symbol = this.symbol) {
    this.symbol = symbol;
    this.manual = false;
    if (this.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) return;
    this.open();
  }

  open() {
    clearTimeout(this.reconnectTimer);
    this.setState("connecting", "CONNECTING");
    this.emit("log", { message: `Conectando ${this.symbol}...`, level: "info" });

    this.ws = new WebSocket(DERIV.ws);

    this.ws.onopen = () => {
      this.setState("live", "LIVE");
      this.emit("log", { message: "Conexión pública Deriv establecida.", level: "ok" });
      this.requestHistory();
      this.subscribe();
      this.startPing();
    };

    this.ws.onmessage = event => this.handleMessage(event);

    this.ws.onerror = () => {
      this.emit("error", { message: "Error WebSocket." });
    };

    this.ws.onclose = event => {
      this.stopPing();
      this.ws = null;
      this.subscriptionId = null;
      this.setState("offline", "OFFLINE");
      this.emit("log", {
        message: `WebSocket cerrado (${event.code}).`,
        level: this.manual ? "warn" : "error"
      });

      if (!this.manual) {
        this.reconnectTimer = setTimeout(() => this.open(), DERIV.reconnectMs);
      }
    };
  }

  requestHistory() {
    this.send({
      ticks_history: this.symbol,
      count: DERIV.historyCount,
      end: "latest",
      style: "ticks",
      adjust_start_time: 1,
      req_id: 701
    });
  }

  subscribe() {
    this.send({
      ticks: this.symbol,
      subscribe: 1,
      req_id: 702
    });
  }

  handleMessage(event) {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    if (data.error) {
      this.emit("error", { message: data.error.message || "Error Deriv." });
      return;
    }

    if (data.msg_type === "history" && data.history) {
      const prices = (data.history.prices || []).map(Number).filter(Number.isFinite);
      const times = (data.history.times || []).map(Number);
      this.emit("history", {
        symbol: this.symbol,
        prices,
        times
      });
      return;
    }

    if (data.subscription?.id) {
      this.subscriptionId = data.subscription.id;
    }

    if (data.msg_type === "tick" && data.tick) {
      const price = Number(data.tick.quote);
      if (!Number.isFinite(price)) return;

      this.emit("tick", {
        symbol: data.tick.symbol || this.symbol,
        price,
        epoch: Number(data.tick.epoch) || Date.now() / 1000,
        pipSize: Number(data.tick.pip_size) || 2
      });
    }
  }

  changeSymbol(symbol) {
    if (!symbol || symbol === this.symbol) return;

    this.symbol = symbol;

    if (this.ws?.readyState === WebSocket.OPEN) {
      if (this.subscriptionId) {
        this.send({ forget: this.subscriptionId });
      }
      this.subscriptionId = null;

      setTimeout(() => {
        this.requestHistory();
        this.subscribe();
      }, 150);
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send({ ping: 1 }), DERIV.pingMs);
  }

  stopPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  disconnect() {
    this.manual = true;
    clearTimeout(this.reconnectTimer);
    this.stopPing();

    if (this.subscriptionId) {
      this.send({ forget: this.subscriptionId });
    }

    try { this.ws?.close(1000, "Manual"); } catch {}
    this.ws = null;
    this.subscriptionId = null;
    this.setState("offline", "OFFLINE");
  }
}

export const derivAPI = new DerivAPI();
