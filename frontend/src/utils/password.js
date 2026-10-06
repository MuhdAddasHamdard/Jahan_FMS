export const PASSWORD_MIN_LENGTH = 8;

export const passwordLengthError = (value) =>
  value.length < PASSWORD_MIN_LENGTH
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    : "";

export const passwordMatchError = (value, source) =>
  value !== source ? "Passwords do not match" : "";

export const PASSWORD_RULE = {
  label: `At least ${PASSWORD_MIN_LENGTH} characters`,
  test: (value) => value.length >= PASSWORD_MIN_LENGTH,
};
