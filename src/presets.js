const wifiEscape = (value) => value.replace(/([\\;,:"])/g, "\\$1");
const vcardEscape = (value) => value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
function compose(kind, f) {
  switch (kind) {
    case "wifi": {
      const auth = f.auth || "WPA";
      const parts = [`T:${auth}`, `S:${wifiEscape(f.ssid ?? "")}`];
      if (auth !== "nopass") parts.push(`P:${wifiEscape(f.password ?? "")}`);
      if (f.hidden === "true") parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    }
    case "email": {
      const query = new URLSearchParams();
      if (f.subject) query.set("subject", f.subject);
      if (f.body) query.set("body", f.body);
      const qs = query.toString().replace(/\+/g, "%20");
      return `mailto:${f.address ?? ""}${qs ? `?${qs}` : ""}`;
    }
    case "sms":
      return `SMSTO:${f.number ?? ""}:${f.message ?? ""}`;
    case "vcard": {
      const lines = ["BEGIN:VCARD", "VERSION:3.0"];
      const first = vcardEscape(f.first ?? "");
      const last = vcardEscape(f.last ?? "");
      lines.push(`N:${last};${first};;;`);
      lines.push(`FN:${[first, last].filter(Boolean).join(" ")}`);
      if (f.org) lines.push(`ORG:${vcardEscape(f.org)}`);
      if (f.title) lines.push(`TITLE:${vcardEscape(f.title)}`);
      if (f.phone) lines.push(`TEL;TYPE=CELL:${vcardEscape(f.phone)}`);
      if (f.email) lines.push(`EMAIL:${vcardEscape(f.email)}`);
      if (f.url) lines.push(`URL:${vcardEscape(f.url)}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    default:
      return f.text ?? "";
  }
}
export {
  compose
};
