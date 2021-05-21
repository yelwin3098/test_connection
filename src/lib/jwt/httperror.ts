/**
 * HttpError class
 */

const STATUS: any = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",

  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",

  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "306": "Switch Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",

  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Time-out",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",

  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Time-out",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "510": "Not Extended",
  "511": "Network Authentication Required",

  "103": "Checkpoint",
  // "103": "Early Hints",
  "419": "I'm a fox (Smoothwall/Foxwall)",
  "420": "Method Failure (Spring Framework)",
  // "420": "Enhance Your Calm (Twitter)",
  // "450": "Blocked by Windows Parental Controls (Microsoft)",
  "498": "Invalid Token (Esri)",
  // "499": "Token Required (Esri)",
  // "499": "Request has been forbidden by antivirus",
  "509": "Bandwidth Limit Exceeded (Apache Web Server/cPanel)",
  "530": "Site is frozen",
  "598": "(Informal convention) Network read timeout error",
  "599": "(Informal convention) Network connect timeout error",

  "440": "Login Time-out",
  "449": "Retry With",
  // "451": "Redirect",

  "444": "No Response",
  "495": "SSL Certificate Error",
  "496": "SSL Certificate Required",
  "497": "HTTP Request Sent to HTTPS Port",
  "499": "Client Closed Request",

  "520": "Unknown Error",
  "521": "Web Server Is Down",
  "522": "Connection Timed Out",
  "523": "Origin Is Unreachable",
  "524": "A Timeout Occurred",
  "525": "SSL Handshake Failed",
  "526": "Invalid SSL Certificate",
  "527": "Railgun Error"
};

export class HttpError extends Error {
  public status: number;
  public title: string;

  constructor(status?: number, message?: string) {
    super(message);

    this.status = status || 500;
    const str = STATUS[`${this.status}`] || "Unknown error.";
    this.title = `${this.status} ${str}`;

    if (!message) {
      this.message = str;
    }
  }
}