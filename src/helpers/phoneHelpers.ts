import { parsePhoneNumber } from "react-phone-number-input";


function formatPhoneForDisplay(phone?: string) {
  if (!phone || phone.trim() === "") return "Not Provided";

  try {
    const parsed = parsePhoneNumber(phone);
    if (!parsed) return phone;

    return `+${parsed.countryCallingCode} ${parsed.nationalNumber}`;
  } catch {
    return phone;
  }
}


export default formatPhoneForDisplay;