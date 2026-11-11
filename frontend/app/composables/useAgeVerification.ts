const STORAGE_KEY = "ageVerified";

export function useAgeVerification() {
  // Reactive so blurred NSFW items reveal as soon as the user confirms
  const verified = useState("age-verified", () => false);

  // Reads a remembered confirmation; client-only, so call it from onMounted
  function init() {
    if (import.meta.client && localStorage.getItem(STORAGE_KEY) === "true") {
      verified.value = true;
    }
  }

  function isVerified(): boolean {
    init();
    return verified.value;
  }

  function confirm(remember = false) {
    verified.value = true;
    if (remember && import.meta.client) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }

  return { verified, init, isVerified, confirm };
}
