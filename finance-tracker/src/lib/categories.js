import { translations } from './translations'

// Colors for custom categories, taken in order and then repeated.
// Each one is the name of a --cat-* variable in index.css
export const customColors = ['cyan', 'fuchsia', 'slate', 'sand']

// Every color a category can have; each is a --cat-* variable in index.css
export const categoryColors = [
  'orange',
  'blue',
  'violet',
  'lime',
  ...customColors,
]

// The color for a custom category, given how many came before it
export function customColorAt(index) {
  return customColors[index % customColors.length]
}

export function categoryColor(category) {
  return `var(--cat-${category.color})`
}

// Built-in categories have a translation key, custom ones have a name
export function categoryLabel(category, t) {
  return category.name ?? t(`category.${category.key}`)
}

// 'Comída ' -> 'comida': ignores case, accents and outer spaces
export function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Built-in categories match their name in any language
export function findCategoryByName(categories, name) {
  const wanted = normalize(name)
  return categories.find((c) => {
    if (c.name) return normalize(c.name) === wanted
    return Object.values(translations).some(
      (strings) => normalize(strings[`category.${c.key}`]) === wanted,
    )
  })
}
