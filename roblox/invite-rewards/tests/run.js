#!/usr/bin/env node
'use strict';
/* Corre las pruebas de las recompensas por invitar (tests.luau) con el
   intérprete de Luau. Necesita el ejecutable `luau` en el PATH, o su ruta en
   la variable LUAU: https://github.com/luau-lang/luau/releases

     node roblox/invite-rewards/tests/run.js
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const scripts = [
  'ReplicatedStorage/InviteRewards.luau',
  'ServerScriptService/InviteRewardsGrant.luau',
  'ServerScriptService/InviteRewardsServer.server.luau',
  'StarterPlayerScripts/InviteRewardsClient.client.luau',
];

const longString = (text) => {
  let level = 1;
  while (text.includes(']' + '='.repeat(level) + ']')) level++;
  const eq = '='.repeat(level);
  return `[${eq}[\n${text}]${eq}]`;
};

const sources = scripts
  .map((file) => `\t[${JSON.stringify(file)}] = ${longString(fs.readFileSync(path.join(root, file), 'utf8'))},`)
  .join('\n');
const program = [
  `local SOURCES = {\n${sources}\n}`,
  fs.readFileSync(path.join(__dirname, 'harness.luau'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'tests.luau'), 'utf8'),
].join('\n');

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'invite-rewards-')), 'all.luau');
fs.writeFileSync(out, program);
const result = spawnSync(process.env.LUAU || 'luau', [out], { stdio: 'inherit' });
if (result.error) {
  console.error(`No se pudo correr luau (${result.error.message}). Instalalo o pasá su ruta en LUAU.`);
  process.exit(1);
}
process.exit(result.status);
