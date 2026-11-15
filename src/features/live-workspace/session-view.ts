// Only display state crosses into the browser. Tokens remain in SDK cookies.
export interface SessionView {
  status: "signed_out" | "forbidden" | "unavailable" | "authorized";
  accountId: string | null;
  name: string;
  role: string | null;
}
