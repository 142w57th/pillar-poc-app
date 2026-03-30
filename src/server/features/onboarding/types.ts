export type OnboardingStatusResult = {
  clientOnboarded: boolean;
  clientId: string | null;
  accounts: Array<{
    accountType: string;
    externalAccountId: string;
  }>;
};

export type CreateAccountRequest = {
  userId: string;
  accountType: string;
  personalInfo?: {
    firstName: string;
    lastName: string;
    middleInitial?: string;
    suffix?: string;
    taxId: string;
    dateOfBirth: string;
    country: string;
    email: string;
    phone: string;
    legalAddress: string;
  };
  suitability: {
    employmentType: string;
    occupation?: string;
    businessType?: string;
    employer?: string;
    businessPhone?: string;
    businessAddress?: string;
    liquidNetWorth?: string;
    totalNetWorth?: string;
    investmentObjective: string;
    riskTolerance: string;
  };
};

export type CreateAccountResult = {
  clientId: string;
  accountId: string;
  externalAccountId: string;
  accountType: string;
};
