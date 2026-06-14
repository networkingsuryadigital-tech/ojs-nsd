export type PaymentCustomer = {
  email: string;
  name?: string;
};

export type CreateChargeInput = {
  orderId: string;
  amount: number;
  currency: string;
  customer: PaymentCustomer;
  itemName: string;
  callbacks?: {
    finish: string;
    error: string;
    pending: string;
  };
  callbackUrl?: string;
  returnUrl?: string;
};

export type CreateChargeResult = {
  externalRef: string;
  paymentUrl: string;
};

/** Generic payment adaptor — JMS adds Xendit in a later sprint. */
export interface PaymentAdapter {
  isConfigured(): boolean;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult | null>;
}

export type MidtransConfig = {
  serverKey?: string;
  isProduction?: boolean;
  appUrl?: string;
};

export type DuitkuConfig = {
  merchantCode?: string;
  apiKey?: string;
  sandbox?: boolean;
};
