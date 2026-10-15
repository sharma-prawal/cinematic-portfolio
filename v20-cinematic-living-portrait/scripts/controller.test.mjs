import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../src/controller.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { normalize, parseMode } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('viewport corners, center and out-of-bounds positions', () => {
  assert.equal(normalize(0,1920),-1); assert.equal(normalize(960,1920),0); assert.equal(normalize(1920,1920),1);
  assert.equal(normalize(-10,1920),-1); assert.equal(normalize(2200,1920),1); assert.equal(normalize(5,0),0);
});
test('mapping remains continuous at center and symmetric on both axes', () => {
  assert.ok(normalize(500.01,1000)>0); assert.ok(normalize(499.99,1000)<0);
  for(let i=0;i<=100;i++) assert.ok(Math.abs(normalize(i,100)+normalize(100-i,100))<1e-12);
});
test('invalid presentation query falls back to photographic baseline', () => {
  for(const value of [null,'','D','<script>']) assert.equal(parseMode(value),'A');
  assert.equal(parseMode('B'),'B'); assert.equal(parseMode('C'),'C');
});
