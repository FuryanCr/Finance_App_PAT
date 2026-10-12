import { describe, expect, it } from 'vitest'
import { categories } from '../db/mockData'
import { categoryColors } from './categories'
import { translations } from './translations'

const { es, en } = translations

describe('translations', () => {
  it('es and en have exactly the same keys', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
  })

  it('has no empty values', () => {
    for (const [language, strings] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(strings)) {
        expect(value, `${language}.${key}`).not.toBe('')
      }
    }
  })

  it('has a category.<key> entry for every built-in category', () => {
    for (const category of categories) {
      expect(es[`category.${category.key}`], `es ${category.key}`).toBeTruthy()
      expect(en[`category.${category.key}`], `en ${category.key}`).toBeTruthy()
    }
  })

  it('has a color.<name> entry for every category color', () => {
    for (const name of categoryColors) {
      expect(es[`color.${name}`], `es ${name}`).toBeTruthy()
      expect(en[`color.${name}`], `en ${name}`).toBeTruthy()
    }
  })
})
