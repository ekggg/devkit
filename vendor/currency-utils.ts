function isZeroDecimalCurrency(currency: string) {
  switch (currency) {
    case "bits": // Twitch bits
    case "bif": // Burundian franc
    case "clp": // Chilean peso
    case "djf": // Djiboutian franc
    case "gnf": // Guinean franc
    case "jpy": // Japanese yen
    case "kmf": // Comoro franc
    case "krw": // South Korean won
    case "mga": // Malagasy ariary
    case "pyg": // Paraguayan guaraní
    case "rwf": // Rwandan franc
    case "ugx": // Ugandan shilling
    case "vnd": // Vietnamese đồng
    case "vuv": // Vanuatu vatu
    case "xaf": // CFA franc BEAC
    case "xof": // CFA franc BCEAO
    case "xpf": // CFP franc
      return true;
    default:
      return false;
  }
}

function isThreeDecimalCurrency(currency: string) {
  switch (currency) {
    case "bhd": // Bahraini dinar
    case "jod": // Jordanian dinar
    case "kwd": // Kuwaiti dinar
    case "omr": // Omani rial
    case "tnd": // Tunisian dinar
      return true;
    default:
      return false;
  }
}

/**
 * Converts a decimal amount to an integer amount.
 *
 * For example:
 * - In USD, $5.50 = 550
 * - In JPY, ¥5.50 = 6 (there are no decimals in JPY)
 * - In EUR, €5.50 = 550
 * - In GBP, £5.50 = 550
 * - In CAD, $5.50 = 550
 * - In AUD, $5.50 = 550
 */
export function getIntegerAmount(amount: number, currency: string): number {
  if (isThreeDecimalCurrency(currency)) {
    return Math.round(amount * 1000);
  }

  if (isZeroDecimalCurrency(currency)) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

/**
 * Converts an integer amount to a decimal amount.
 *
 * For example:
 * - In USD, 550 = $5.50
 * - In JPY, 600 = ¥600
 */
export function getDecimalAmount(amount: number, currency: string): number {
  if (isThreeDecimalCurrency(currency.toLowerCase())) {
    return amount / 1000;
  }

  if (isZeroDecimalCurrency(currency.toLowerCase())) {
    return amount;
  }

  return amount / 100;
}
