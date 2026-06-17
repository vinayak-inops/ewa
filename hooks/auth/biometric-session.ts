let biometricSessionUnlocked = false;

export function isBiometricSessionUnlocked() {
  return biometricSessionUnlocked;
}

export function setBiometricSessionUnlocked(unlocked: boolean) {
  biometricSessionUnlocked = unlocked;
}
