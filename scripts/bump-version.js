const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Incrementa a versão minor mantendo o major e zerando o patch (1.0.0 -> 1.1.0).
const parts = pkg.version.split('.');
let major = parseInt(parts[0], 10) || 0;
let minor = parseInt(parts[1], 10) || 0;

minor += 1;
pkg.version = `${major}.${minor}.0`;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const displayVersion = `v${major}.${minor}`;
console.log(`\n==============================================`);
console.log(`  SCRYBA: Versão atualizada para ${displayVersion}`);
console.log(`==============================================\n`);

try {
  execSync('git add package.json', { stdio: 'ignore' });
  execSync(`git commit -m "chore: bump version to ${displayVersion}"`, { stdio: 'ignore' });
  console.log(`Commit registrado no Git com sucesso: "chore: bump version to ${displayVersion}"\n`);
} catch (err) {
  // Ignora se não houver git configurado
}
