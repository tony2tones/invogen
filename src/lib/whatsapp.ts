export function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  const encoded = encodeURIComponent(message);
  if (!phone) return `https://wa.me/?text=${encoded}`;

  let digits = phone.replace(/[^0-9]/g, '');
  // South African local numbers ("071...") need the country code for wa.me.
  if (digits.startsWith('0')) digits = '27' + digits.slice(1);
  return `https://wa.me/${digits}?text=${encoded}`;
}
