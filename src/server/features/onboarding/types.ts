export type OnboardingStatusResult = {
  clientOnboarded: boolean;
  clientId: string | null;
  accounts: Array<{
    accountType: string;
    externalAccountId: string;
  }>;
};

export type AccountTemplateCodeResult = {
  accountTemplateCode: string;
  offeringCode?: string;
};

export type OnboardingAccountTemplatesResult = {
  accountTemplates: AccountTemplateCodeResult[];
  meta: {
    provider: "harbor";
    source: string;
    generatedAt: string;
  };
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
    phone: {
      countryCode: string;
      phoneNumber: string;
    };
    legalAddress: {
      line1: string;
      city: string;
      countryCode: string;
    };
  };
  suitability: {
    employmentType: string;
    occupation?: string;
    businessType?: string;
    employer?: string;
    businessPhone?: string;
    businessPhoneCountryCode?: string;
    businessPhoneNumber?: string;
    businessAddress?: string;
    businessRegion?: string;
    businessPostalCode?: string;
    annualIncome?: string;
    liquidNetWorth?: string;
    totalNetWorth?: string;
    sourceOfFunds?: string;
    sourceOfFundsItems?: string[];
    timeHorizonMinYears?: string;
    timeHorizonMaxYears?: string;
    dividendReinvestmentInstruction?: string;
    investmentObjective: string;
    investmentObjectives?: string[];
    riskTolerance: string;
  };
};

export type CreateAccountResult = {
  clientId: string;
  accountId: string;
  externalAccountId: string;
  accountType: string;
};
