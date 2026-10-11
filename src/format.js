export function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}
