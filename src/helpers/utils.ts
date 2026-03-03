export function formatNumber(number: string) {
  if (!number) return null;

  // Convertir a string y quitar todo lo que no sea número
  let digits = number.toString().replace(/\D/g, '');

  // Si está vacío, retornar null
  if (!digits) return null;

  // Si empieza con +51, quitar el +
  if (digits.startsWith('+51')) {
    digits = digits.substring(1);
  }

  // Si empieza con 51, dejarlo así
  if (digits.startsWith('51')) {
    return `${digits}@s.whatsapp.net`;
  }

  // Si empieza con 0 y tiene 10 dígitos, quitar el 0
  if (digits.startsWith('0') && digits.length === 10) {
    digits = digits.substring(1);
  }

  // Si no empieza con 51 pero tiene 9 dígitos (Perú), agregar 51
  if (!digits.startsWith('51') && digits.length === 9) {
    digits = '51' + digits;
  }

  // Validación final: debe tener 11 dígitos (51 + 9)
  if (digits.length !== 11) {
    return null;
  }

  return `${digits}@s.whatsapp.net`;
}