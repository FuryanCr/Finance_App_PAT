// Built-in categories have a translation key, custom ones have a name
export function categoryLabel(category, t) {
  return category.name ?? t(`category.${category.key}`)
}
