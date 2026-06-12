import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath =
  "/Users/joaomvalente/Documents/Trabalho/ANALISE DE DADOS/Analise ibope - ABRIL/Relatório_Ibope_Abril_MaravilhaFM.xlsx";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));

const summary = await workbook.inspect({
  kind: "workbook,sheet,table,drawing",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 16,
  tableMaxCellChars: 120,
});

console.log(summary.ndjson);

for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  console.log(`\n=== ${sheet.name} | ${used.address} ===`);
  const region = await workbook.inspect({
    kind: "region",
    sheetId: sheet.name,
    range: used.address,
    maxChars: 10000,
    tableMaxRows: 30,
    tableMaxCols: 20,
    tableMaxCellChars: 120,
  });
  console.log(region.ndjson);
}
