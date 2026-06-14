import { APC_ORDER_ID_PREFIX } from "./types";

export function buildApcOrderId(invoiceId: string): string {
  return `${APC_ORDER_ID_PREFIX}${invoiceId}`;
}

export function parseApcOrderId(orderId: string): string | null {
  if (!orderId.startsWith(APC_ORDER_ID_PREFIX)) {
    return null;
  }
  const invoiceId = orderId.slice(APC_ORDER_ID_PREFIX.length);
  return invoiceId.length > 0 ? invoiceId : null;
}
