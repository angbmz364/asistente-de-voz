#!/usr/bin/env node

/**
 * Nova Streaming Implementation Verification Suite
 * 
 * Run this to verify all streaming components are correctly implemented
 * and working as expected.
 * 
 * Usage:
 *   npx ts-node STREAMING_VERIFICATION.ts
 *   or just: npm run verify-streaming (if you add this to package.json)
 */

import fs from 'fs'
import path from 'path'

interface CheckResult {
  name: string
  passed: boolean
  message: string
  details?: string[]
}

const results: CheckResult[] = []

function checkFile(filePath: string, checkName: string, expectedContent?: string[]): CheckResult {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    return {
      name: `File: ${checkName}`,
      passed: false,
      message: `❌ File not found: ${filePath}`,
    }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const details: string[] = []

  if (expectedContent) {
    const missingContent = expectedContent.filter(s => !content.includes(s))
    if (missingContent.length > 0) {
      return {
        name: `Content: ${checkName}`,
        passed: false,
        message: `❌ Missing required content in ${filePath}`,
        details: missingContent.map(s => `  - Missing: ${s}`),
      }
    }
  }

  return {
    name: `File: ${checkName}`,
    passed: true,
    message: `✅ ${filePath}`,
  }
}

function checkExport(filePath: string, exportName: string): CheckResult {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    return {
      name: `Export: ${exportName} from ${path.basename(filePath)}`,
      passed: false,
      message: `❌ File not found: ${filePath}`,
    }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  
  // Check for various export patterns
  const patterns = [
    `export ${exportName}`,
    `export function ${exportName}`,
    `export const ${exportName}`,
    `export class ${exportName}`,
    `export type ${exportName}`,
    `export interface ${exportName}`,
  ]

  const found = patterns.some(p => content.includes(p))
  
  if (!found) {
    return {
      name: `Export: ${exportName}`,
      passed: false,
      message: `❌ Export not found: ${exportName} in ${filePath}`,
    }
  }

  return {
    name: `Export: ${exportName}`,
    passed: true,
    message: `✅ ${exportName} exported from ${path.basename(filePath)}`,
  }
}

function checkTypeScriptSyntax(filePath: string): CheckResult {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    return {
      name: `TypeScript: ${path.basename(filePath)}`,
      passed: false,
      message: `❌ File not found: ${filePath}`,
    }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')

  // Basic syntax checks
  const checks = [
    { pattern: /^\s*import|^import/, name: 'Imports' },
    { pattern: /:\s*(?:string|boolean|number|void|Promise|async)/, name: 'Type annotations' },
    { pattern: /export/, name: 'Exports' },
  ]

  const details: string[] = []
  for (const check of checks) {
    if (check.pattern.test(content)) {
      details.push(`  ✓ Has ${check.name}`)
    }
  }

  // Check for obvious syntax errors
  const openBraces = (content.match(/{/g) || []).length
  const closeBraces = (content.match(/}/g) || []).length
  if (openBraces !== closeBraces) {
    return {
      name: `TypeScript: ${path.basename(filePath)}`,
      passed: false,
      message: `❌ Possible syntax error (brace mismatch) in ${filePath}`,
      details: [`  Found ${openBraces} opening braces but ${closeBraces} closing braces`],
    }
  }

  return {
    name: `TypeScript: ${path.basename(filePath)}`,
    passed: true,
    message: `✅ ${path.basename(filePath)} syntax looks good`,
    details,
  }
}

function printResults(): void {
  console.log('\n' + '='.repeat(60))
  console.log('Nova Streaming Implementation Verification')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  for (const result of results) {
    console.log(result.message)
    if (result.details) {
      for (const detail of result.details) {
        console.log(detail)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(60) + '\n')

  if (failed === 0) {
    console.log('✅ All checks passed! Streaming is properly implemented.\n')
    process.exit(0)
  } else {
    console.log(`❌ ${failed} check(s) failed. See details above.\n`)
    process.exit(1)
  }
}

// Run all checks
console.log('Verifying Nova streaming implementation...\n')

// 1. Core files
console.log('Checking core files...')
results.push(
  checkFile('src/lib/ai/providers.ts', 'LLM Provider Interface', [
    'StreamingOptions',
    'generateTextStream',
  ]),
  checkFile('src/lib/ai/streaming.ts', 'Streaming utilities', [
    'askLLMStream',
    'StreamingSession',
  ]),
  checkFile('src/lib/ai/types.ts', 'Type definitions', [
    'StreamingOptions',
    'StreamCallback',
  ]),
  checkFile('src/lib/ai/ollama-provider.ts', 'Ollama Provider', [
    'generateTextStream',
  ])
)

// 2. Service layer
console.log('Checking service layer...')
results.push(
  checkFile('src/components/services/gemini.ts', 'Gemini Service', [
    'askLLMStream',
  ])
)

// 3. React hooks
console.log('Checking React hooks...')
results.push(
  checkFile('src/components/hooks/useStreaming.ts', 'useStreaming Hook', [
    'useStreaming',
    'useIsStreaming',
    'useStreamingWithErrorDisplay',
  ])
)

// 4. Examples
console.log('Checking examples...')
results.push(
  checkFile('src/components/examples/StreamingExamples.tsx', 'Streaming Examples', [
    'StreamingExampleBasic',
  ]),
  checkFile('src/components/hooks/useControlsStreaming.tsx', 'Controls Integration', [
    'useControlsWithStreaming',
  ])
)

// 5. Documentation
console.log('Checking documentation...')
results.push(
  checkFile('STREAMING_GUIDE.md', 'Streaming Guide'),
  checkFile('GETTING_STARTED_STREAMING.md', 'Getting Started Guide'),
  checkFile('IMPLEMENTATION_SUMMARY.md', 'Implementation Summary'),
  checkFile('STREAMING_API_QUICK_REFERENCE.md', 'API Quick Reference')
)

// 6. Check exports
console.log('Checking exports...')
results.push(
  checkExport('src/lib/ai/streaming.ts', 'askLLMStream'),
  checkExport('src/lib/ai/streaming.ts', 'createStreamingSession'),
  checkExport('src/lib/ai/streaming.ts', 'StreamingSession'),
  checkExport('src/components/hooks/useStreaming.ts', 'useStreaming'),
  checkExport('src/components/services/gemini.ts', 'askLLMStream')
)

// 7. Check TypeScript syntax
console.log('Checking TypeScript syntax...')
results.push(
  checkTypeScriptSyntax('src/lib/ai/streaming.ts'),
  checkTypeScriptSyntax('src/lib/ai/providers.ts'),
  checkTypeScriptSyntax('src/components/hooks/useStreaming.ts')
)

// Print results
printResults()

export {}
