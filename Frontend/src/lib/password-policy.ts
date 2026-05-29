export const PASSWORD_POLICY_TEXT = "Password must be at least 10 characters and include one special character.";

export function getPasswordPolicyChecks(password: string) {
  return {
    hasMinLength: password.length >= 10,
    hasSpecialCharacter: /[^\w\s]/.test(password),
  };
}

export function getPasswordPolicyError(password: string) {
  const checks = getPasswordPolicyChecks(password);
  if (!checks.hasMinLength) return "Password must be at least 10 characters.";
  if (!checks.hasSpecialCharacter) return "Password must include at least one special character.";
  return null;
}
