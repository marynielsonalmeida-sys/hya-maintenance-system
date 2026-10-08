import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseNfeXml, weightedAverageCost, MAX_NFE_XML_BYTES } from "@/lib/accounting/xml";

const validXml = `<NFe><infNFe Id="NFe35240112345678000199550010000000011000000018"><ide><nNF>1</nNF><serie>1</serie><dhEmi>2024-01-01T12:00:00-03:00</dhEmi></ide><emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Teste</xNome></emit><dest><CNPJ>98765432000100</CNPJ></dest><det nItem="1"><prod><cProd>A1</cProd><xProd>Rolamento</xProd><NCM>84821010</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>2</qCom><vUnCom>10.00</vUnCom><vProd>20.00</vProd></prod></det><total><ICMSTot><vNF>20.00</vNF></ICMSTot></total></infNFe></NFe>`;
test("parser importa os campos essenciais da NF-e", () => { const parsed = parseNfeXml(validXml); assert.equal(parsed.accessKey.length, 44); assert.equal(parsed.supplierName, "Fornecedor Teste"); assert.equal(parsed.totalAmount, 20); assert.equal(parsed.items[0].quantity, 2); });
test("parser rejeita XXE e XML acima do limite", () => { assert.throws(() => parseNfeXml(`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${validXml}`)); assert.throws(() => parseNfeXml("x".repeat(MAX_NFE_XML_BYTES + 1))); });
test("custo médio ponderado combina estoques", () => { assert.equal(weightedAverageCost(10, 10, 10, 20), 15); });
test("migration cria unicidade por empresa para chave de acesso e políticas por company", () => { const sql = readFileSync("supabase/migrations/0012_accounting_inventory_core.sql", "utf8"); assert.match(sql, /unique \(company_id, access_key\)/i); assert.match(sql, /is_company_member\(company_id\)/i); assert.match(sql, /fiscal-documents/i); });
test("provider fiscal permanece explícito sem integração externa", () => { const source = readFileSync("src/lib/accounting/provider.ts", "utf8"); assert.match(source, /Emissão fiscal ainda não configurada/); });
