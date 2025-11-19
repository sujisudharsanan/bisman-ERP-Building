import { TrialOnboardingInput, RegisteredClientWizardState, StepValidationResult } from '@/types/onboarding';

export function validateTrial(input: Partial<TrialOnboardingInput>): StepValidationResult {
  const errors: Record<string,string> = {};
  if (!input.save_as_draft) {
    if (!input.full_name) errors.full_name = 'Full Name required';
    if (!input.work_email || !isEmail(input.work_email)) errors.work_email = 'Valid work email required';
    if (!input.password) errors.password = 'Password required';
    if (input.password && !isStrongPassword(input.password)) errors.password = 'Weak password';
    if (input.password !== input.confirm_password) errors.confirm_password = 'Passwords do not match';
    if (!input.consent_terms) errors.consent_terms = 'Terms consent required';
    if (!input.consent_privacy) errors.consent_privacy = 'Privacy consent required';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRegisteredStep(state: RegisteredClientWizardState, step: keyof RegisteredClientWizardState): StepValidationResult {
  const errors: Record<string,string> = {};
  switch(step) {
    case 'identification': {
      const s = state.identification;
      if (!s.legal_name) errors.legal_name = 'Legal Name required';
      if (s.tax_id && !isTaxId(s.tax_id)) errors.tax_id = 'Invalid Tax ID';
      break;
    }
    case 'registration': {
      const r = state.registration;
      if (!r.primary_address?.line1) errors.primary_address_line1 = 'Address line1 required';
      if (!r.primary_address?.country) errors.primary_address_country = 'Country required';
      if (!r.preferred_currency) errors.preferred_currency = 'Preferred currency required';
      break;
    }
    case 'primary_contact': {
      const c = state.primary_contact;
      if (!c.admin_name) errors.admin_name = 'Admin name required';
      if (!isEmail(c.admin_email)) errors.admin_email = 'Valid admin email required';
      if (!c.admin_mobile) errors.admin_mobile = 'Admin mobile required';
      break;
    }
    case 'legal': {
      const l = state.legal;
      if (!l.terms_of_service) errors.terms_of_service = 'Terms of Service consent required';
      break;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function isEmail(e?: string) {
  return !!e && /^(?=.{5,150}$)[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}
export function isStrongPassword(p?: string) {
  return !!p && /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{10,}$/.test(p);
}
export function isTaxId(id?: string) {
  if (!id) return true;
  const s = id.trim().toUpperCase();
  return /^[A-Z0-9]{10,15}$/.test(s);
}
