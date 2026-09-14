import type { BusinessProfile } from '@/types/database';

export function hasBankingDetails(business: BusinessProfile) {
  return !!(
    business.bank_name ||
    business.account_holder ||
    business.account_number ||
    business.branch_code ||
    business.account_type ||
    business.swift_code
  );
}
