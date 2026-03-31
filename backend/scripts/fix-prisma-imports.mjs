import fs from 'fs'
import path from 'path'

const root = path.resolve(process.cwd(), 'dist', 'generated', 'prisma')

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.isFile() && full.endsWith('.js')) fixFile(full)
  }
}

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8')
  // Add .js to relative import/export specifiers that don't have an extension
  // Avoid touching imports from packages (no leading ./ or ../)
  content = content.replace(/(from\s+)(['"])(\.\/|\.\.\/)([^'";]+)\2/g, (m, p1, quote, rel, p3) => {
    // if it already has an extension, leave it
    if (/\.[a-zA-Z0-9]+$/.test(p3)) return m
    return `${p1}${quote}${rel}${p3}.js${quote}`
  })
  // also handle import\s+"./foo" style
  content = content.replace(/(import\s+)(['"])(\.\/|\.\.\/)([^'";]+)\2/g, (m, p1, quote, rel, p3) => {
    if (/\.[a-zA-Z0-9]+$/.test(p3)) return m
    return `${p1}${quote}${rel}${p3}.js${quote}`
  })
  fs.writeFileSync(file, content, 'utf8')
}

if (fs.existsSync(root)) {
  walk(root)
} else {
  console.error('Prisma dist folder not found: dist/generated/prisma')
  process.exit(1)
}
