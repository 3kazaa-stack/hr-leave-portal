/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// FR8.1: colour values live only in tokens.css.
const HEX_COLOUR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?)\(/

// Vitest runs with the ui/ folder as its root (see vite.config.ts).
const SRC_DIR = join(process.cwd(), 'src')
const TOKENS_FILE = join('theme', 'tokens.css')

function sourceFiles(extension: string): string[] {
  return readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith(extension))
    .sort()
}

function filesWithColours(paths: string[]): string[] {
  return paths.filter((path) => {
    const source = readFileSync(join(SRC_DIR, path), 'utf8')
    return HEX_COLOUR.test(source) || COLOUR_FUNCTION.test(source)
  })
}

describe('design tokens', () => {
  it('defines the FR8.1 palette in tokens.css', () => {
    const tokens = readFileSync(join(SRC_DIR, TOKENS_FILE), 'utf8').toLowerCase()
    for (const colour of ['#0899e0', '#33cac6', '#20b4d2', '#1b4784', '#102063', '#f3f4fb', '#f07c29']) {
      expect(tokens).toContain(colour)
    }
  })

  it('finds no colour literal in components or other stylesheets', () => {
    const components = sourceFiles('.tsx')
    const stylesheets = sourceFiles('.css').filter((path) => path !== TOKENS_FILE)
    expect(components.length).toBeGreaterThan(0)
    expect(stylesheets).toContain(join('theme', 'global.css'))

    expect(filesWithColours(components)).toEqual([])
    expect(filesWithColours(stylesheets)).toEqual([])
  })
})
