const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { pathToFileURL, fileURLToPath } = require('url');

let mainWindow;

if (process.platform === 'win32') app.setAppUserModelId('com.scryba.desktop');

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'wma']);
function copyAudioIntoProject(sourcePath, folderPath, category) {
  const extension = path.extname(sourcePath).toLowerCase().slice(1);
  if (!AUDIO_EXTENSIONS.has(extension) || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return null;
  const originalName = path.basename(sourcePath);
  const safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || `audio.${extension}`;
  const destinationDir = path.join(folderPath, 'assets', 'audio', category);
  fs.mkdirSync(destinationDir, { recursive: true });
  const safeExtension = path.extname(safeName) || `.${extension}`;
  const stem = path.basename(safeName, safeExtension);
  let destinationPath = path.join(destinationDir, safeName);
  let suffix = 2;
  while (fs.existsSync(destinationPath)) destinationPath = path.join(destinationDir, `${stem} (${suffix++})${safeExtension}`);
  fs.copyFileSync(sourcePath, destinationPath);
  return {
    name: path.basename(destinationPath, safeExtension),
    relativePath: path.relative(folderPath, destinationPath).split(path.sep).join('/')
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: 'Scryba - Estúdio de Escrita & RPG',
    backgroundColor: '#0a0b0e',
    icon: path.join(__dirname, 'src', 'assets', 'scryba-mark.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Carrega a interface principal
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Oculta a barra de menu padrão para um design limpo e moderno (estilo Notion/Obsidian)
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// CANAIS IPC NATIVOS (SISTEMA DE ARQUIVOS & VERSÃO)
// ==========================================

// 0. Versão do aplicativo (major.minor)
ipcMain.handle('app:get-version', () => {
  const ver = app.getVersion();
  const parts = ver.split('.');
  return `${parts[0] || '1'}.${parts[1] || '0'}`;
});

ipcMain.handle('document:export-pdf', async (_event, { html, fileName }) => {
  if (typeof html !== 'string' || html.length > 80_000_000) {
    return { success: false, error: 'O documento está vazio ou excede o limite de exportação.' };
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar documento em PDF',
    defaultPath: fileName || 'documento.pdf',
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  const printWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, javascript: false },
  });
  const tempFolder = fs.mkdtempSync(path.join(app.getPath('temp'), 'scryba-export-'));
  const htmlPath = path.join(tempFolder, 'document.html');
  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    await printWindow.loadFile(htmlPath);
    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0.6, bottom: 0.6, left: 0.7, right: 0.7 },
    });
    fs.writeFileSync(result.filePath, pdf);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy();
    fs.rmSync(tempFolder, { recursive: true, force: true });
  }
});

function xmlEscape(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function makeCrc32Table() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    return value >>> 0;
  });
}
const crc32Table = makeCrc32Table();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const [fileName, rawContent] of Object.entries(entries)) {
    const name = Buffer.from(fileName.replace(/\\/g, '/'), 'utf8');
    const raw = Buffer.isBuffer(rawContent) ? rawContent : Buffer.from(rawContent, 'utf8');
    const compressed = zlib.deflateRawSync(raw);
    const checksum = crc32(raw);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(centralParts.length, 8);
  end.writeUInt16LE(centralParts.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function docxRun(run = {}, defaultSettings = {}, imageRelIds = new Map()) {
  if (run.image) {
    const relId = imageRelIds.get(run.image);
    if (!relId) return `<w:r><w:t>${xmlEscape(run.alt ? `[Imagem: ${run.alt}]` : '[Imagem]')}</w:t></w:r>`;
    const maxWidth = Math.max(1, (defaultSettings.widthTwips - 2 * defaultSettings.marginTwips - defaultSettings.gutterTwips) / 1440 * 914400);
    const ratio = Math.min(1, maxWidth / (Math.max(1, Number(run.width) || 600) * 9525));
    const cx = Math.max(1, Math.round((Number(run.width) || 600) * 9525 * ratio));
    const cy = Math.max(1, Math.round((Number(run.height) || 400) * 9525 * ratio));
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${imageRelIds.size}" name="Imagem ${imageRelIds.size}" descr="${xmlEscape(run.alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${imageRelIds.size}" name="Imagem ${imageRelIds.size}" descr="${xmlEscape(run.alt)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }
  const properties = [];
  const selectedFont = (run.font || '').replace(/["']/g, '').split(',')[0].trim();
  const font = /^[\w -]{1,50}$/.test(selectedFont) ? selectedFont : defaultSettings.font;
  if (font) properties.push(`<w:rFonts w:ascii="${xmlEscape(font)}" w:hAnsi="${xmlEscape(font)}"/>`);
  if (run.bold) properties.push('<w:b/>');
  if (run.italic) properties.push('<w:i/>');
  if (run.underline) properties.push('<w:u w:val="single"/>');
  if (run.strike) properties.push('<w:strike/>');
  const toHex = value => {
    if (/^#[0-9a-f]{6}$/i.test(value || '')) return value.slice(1);
    const rgb = String(value || '').match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    return rgb ? rgb.slice(1, 4).map(channel => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, '0')).join('') : '';
  };
  const color = toHex(run.color);
  if (color) properties.push(`<w:color w:val="${color}"/>`);
  const highlight = toHex(run.highlight);
  if (highlight) properties.push(`<w:shd w:val="clear" w:fill="${highlight}"/>`);
  const cssSize = Number.parseFloat(run.size);
  const unit = String(run.size || '').trim().match(/[a-z%]+$/i)?.[0]?.toLowerCase();
  const points = Number.isFinite(cssSize)
    ? (unit === 'px' ? cssSize * 0.75 : ['em', 'rem', '%'].includes(unit) ? cssSize * (defaultSettings.fontSizeHalfPoints / 2) * (unit === '%' ? 0.01 : 1) : cssSize)
    : defaultSettings.fontSizeHalfPoints / 2;
  if (points > 0 && points < 200) properties.push(`<w:sz w:val="${Math.round(points * 2)}"/><w:szCs w:val="${Math.round(points * 2)}"/>`);
  const content = `${run.text || ''}${run.href ? ` (${run.href})` : ''}`;
  const textRuns = content.split('\n').map((text, index) => `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${xmlEscape(text)}</w:t>`).join('');
  return `<w:r>${properties.length ? `<w:rPr>${properties.join('')}</w:rPr>` : ''}${textRuns}</w:r>`;
}

function docxBlock(block, settings, imageRelIds) {
  if (block.type === 'pageBreak') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  if (block.type === 'toc') {
    return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="300"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Sumário</w:t></w:r></w:p>' +
      '<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o &quot;1-1&quot; \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Abra no Word e atualize o campo para preencher o sumário.</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  }
  const properties = [];
  if (block.type === 'title') properties.push('<w:pStyle w:val="Title"/>');
  else if (block.type === 'heading' || block.type === 'chapterHeading') properties.push(`<w:pStyle w:val="Heading${Math.max(1, Math.min(3, block.level || 1))}"/>`);
  if (block.align) properties.push(`<w:jc w:val="${({ left: 'left', center: 'center', right: 'right', justify: 'both' })[block.align] || 'left'}"/>`);
  if (block.indent) properties.push('<w:ind w:left="560"/>');
  if (block.type === 'listItem') properties.push('<w:ind w:left="360" w:hanging="180"/>');
  else if (block.type === 'paragraph') properties.push(`<w:ind w:firstLine="${block.noIndent ? 0 : block.textIndent !== null && block.textIndent !== undefined ? Math.max(0, Math.round(Number(block.textIndent) * 20)) : 360}"/>`);
  const lineTwips = Math.round((Number(block.lineHeight) || settings.leadingTwips / 240) * 240);
  properties.push(`<w:spacing w:after="${block.type === 'paragraph' ? 100 : 220}" w:line="${lineTwips}" w:lineRule="auto"/>`);
  const runs = (block.runs || []).map(run => docxRun(run, settings, imageRelIds)).join('') || '<w:r><w:t></w:t></w:r>';
  return `<w:p><w:pPr>${properties.join('')}</w:pPr>${runs}</w:p>`;
}

function createDocxDocument({ title, blocks, settings }) {
  const imageRecords = [];
  const imageRelIds = new Map();
  for (const block of blocks) for (const run of block.runs || []) {
    if (!run.image || imageRelIds.has(run.image) || imageRecords.reduce((sum, image) => sum + image.buffer.length, 0) > 80_000_000) continue;
    try {
      let buffer;
      let extension;
      let contentType;
      if (run.image.startsWith('data:image/')) {
        const match = run.image.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,([\s\S]+)$/i);
        if (!match) continue;
        extension = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
        buffer = Buffer.from(match[2], 'base64');
      } else if (run.image.startsWith('file://')) {
        const imagePath = fileURLToPath(run.image);
        extension = path.extname(imagePath).slice(1).toLowerCase();
        if (!['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(extension)) continue;
        buffer = fs.readFileSync(imagePath);
        if (buffer.length > 25_000_000) continue;
        if (extension === 'jpeg') extension = 'jpg';
      } else continue;
      if (buffer.length > 25_000_000 || !buffer.length) continue;
      contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
      const imageId = imageRecords.length + 1;
      const relId = `rIdImage${imageId}`;
      const record = { imageId, relId, extension, contentType, buffer, source: run.image };
      imageRecords.push(record);
      imageRelIds.set(run.image, relId);
    } catch (error) {
      console.warn('Imagem ignorada ao exportar Word:', error.message);
    }
  }
  const content = blocks.map(block => docxBlock(block, settings, imageRelIds)).join('');
  const headerRef = settings.runningHeader ? `<w:headerReference w:type="default" r:id="rIdHeader"/>${settings.hideFirstPage ? '<w:headerReference w:type="first" r:id="rIdHeaderFirst"/>' : ''}` : '';
  const footerRef = settings.pageNumbers ? `<w:footerReference w:type="default" r:id="rIdFooter"/>${settings.hideFirstPage ? '<w:footerReference w:type="first" r:id="rIdFooterFirst"/>' : ''}` : '';
  const titlePage = settings.hideFirstPage ? '<w:titlePg/>' : '';
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${content}<w:sectPr>${headerRef}${footerRef}<w:pgSz w:w="${settings.widthTwips}" w:h="${settings.heightTwips}"/><w:pgMar w:top="${settings.marginTwips}" w:right="${settings.marginTwips}" w:bottom="${settings.marginTwips}" w:left="${settings.marginTwips}" w:header="500" w:footer="500" w:gutter="${settings.gutterTwips}"/>${titlePage}</w:sectPr></w:body></w:document>`;
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="777777"/><w:sz w:val="16"/></w:rPr><w:t>${xmlEscape(title)}</w:t></w:r></w:p></w:hdr>`;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const blankHeaderXml = '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:hdr>';
  const blankFooterXml = '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:ftr>';
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${xmlEscape(settings.font)}" w:hAnsi="${xmlEscape(settings.font)}"/><w:sz w:val="${settings.fontSizeHalfPoints}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="${settings.leadingTwips}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="600"/></w:pPr><w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="300"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`;
  const relationships = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    ...(settings.runningHeader ? ['<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'] : []),
    ...(settings.runningHeader && settings.hideFirstPage ? ['<Relationship Id="rIdHeaderFirst" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="headerFirst.xml"/>'] : []),
    ...(settings.pageNumbers ? ['<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'] : []),
    ...(settings.pageNumbers && settings.hideFirstPage ? ['<Relationship Id="rIdFooterFirst" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerFirst.xml"/>'] : []),
    ...imageRecords.map(image => `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${image.imageId}.${image.extension}"/>`)
  ].join('');
  const imageTypes = [...new Set(imageRecords.map(image => `<Default Extension="${image.extension}" ContentType="${image.contentType}"/>`))];
  const contentTypes = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>','<Default Extension="xml" ContentType="application/xml"/>',...imageTypes,'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>','<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>','<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>','<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',...(settings.runningHeader ? ['<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'] : []),...(settings.runningHeader && settings.hideFirstPage ? ['<Override PartName="/word/headerFirst.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'] : []),...(settings.pageNumbers ? ['<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'] : []),...(settings.pageNumbers && settings.hideFirstPage ? ['<Override PartName="/word/footerFirst.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'] : [])].join('');
  const entries = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${contentTypes}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdOfficeDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCoreProperties" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    'word/document.xml': documentXml,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`,
    'word/styles.xml': stylesXml,
    ...(settings.runningHeader ? { 'word/header1.xml': headerXml } : {}),
    ...(settings.runningHeader && settings.hideFirstPage ? { 'word/headerFirst.xml': blankHeaderXml } : {}),
    ...(settings.pageNumbers ? { 'word/footer1.xml': footerXml } : {}),
    ...(settings.pageNumbers && settings.hideFirstPage ? { 'word/footerFirst.xml': blankFooterXml } : {}),
    'word/settings.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${settings.gutterTwips ? '<w:mirrorMargins/>' : ''}<w:updateFields w:val="true"/></w:settings>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(title)}</dc:title></cp:coreProperties>`
  };
  for (const image of imageRecords) entries[`word/media/image${image.imageId}.${image.extension}`] = image.buffer;
  return makeZip(entries);
}

ipcMain.handle('document:export-word', async (_event, payload) => {
  if (!payload || typeof payload.title !== 'string' || !Array.isArray(payload.blocks) || payload.blocks.length > 100000) {
    return { success: false, error: 'O documento está vazio ou excede o limite de exportação.' };
  }
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar documento do Word', defaultPath: payload.fileName || 'livro.docx',
      filters: [{ name: 'Documento Word', extensions: ['docx'] }]
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    const settings = payload.settings || {};
    const normalized = {
      widthTwips: Math.min(30000, Math.max(5000, Number(settings.widthTwips) || 16838)),
      heightTwips: Math.min(30000, Math.max(5000, Number(settings.heightTwips) || 23811)),
      marginTwips: Math.min(4000, Math.max(500, Number(settings.marginTwips) || 1134)),
      gutterTwips: Math.min(2500, Math.max(0, Number(settings.gutterTwips) || 0)),
      font: /^[\w -]{1,50}$/.test(settings.font || '') ? settings.font : 'Georgia',
      fontSizeHalfPoints: Math.min(96, Math.max(12, Number(settings.fontSizeHalfPoints) || 22)),
      leadingTwips: Math.min(800, Math.max(200, Number(settings.leadingTwips) || 360)),
      pageNumbers: Boolean(settings.pageNumbers), runningHeader: Boolean(settings.runningHeader), chapterBreak: Boolean(settings.chapterBreak),
      hideFirstPage: Boolean(settings.hideFirstPage)
    };
    const buffer = createDocxDocument({ title: payload.title.slice(0, 240), blocks: payload.blocks, settings: normalized });
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 1. Selecionar pasta para o projeto
ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecione a Pasta do Projeto',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: null };
  }
  return { success: true, path: result.filePaths[0] };
});

// 2. Selecionar imagem local (para Moodboard ou Avatares)
ipcMain.handle('dialog:select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Imagem',
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] },
      { name: 'Todos os Arquivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, filePath: null };
  }
  return {
    success: true,
    filePath: result.filePaths[0],
    fileUrl: pathToFileURL(result.filePaths[0]).href
  };
});

ipcMain.handle('project:import-audio', async (_event, { folderPath, category }) => {
  try {
    if (!folderPath || !['music', 'effects'].includes(category)) throw new Error('Projeto ou categoria de áudio inválidos.');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: category === 'music' ? 'Adicionar música de ambientação' : 'Adicionar efeito sonoro',
      filters: [{ name: 'Arquivos de áudio', extensions: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'wma'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

    const sourcePath = result.filePaths[0];
    const copied = copyAudioIntoProject(sourcePath, folderPath, category);
    if (!copied) throw new Error('O arquivo selecionado não é um formato de áudio compatível.');
    return {
      success: true,
      ...copied
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:import-dropped-audio', async (_event, { folderPath, category, sourcePaths }) => {
  try {
    if (!folderPath || !['music', 'effects'].includes(category) || !Array.isArray(sourcePaths)) {
      throw new Error('Projeto, categoria ou arquivos de áudio inválidos.');
    }
    const imported = [];
    for (const sourcePath of sourcePaths.slice(0, 1000)) {
      if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) continue;
      try {
        const copied = copyAudioIntoProject(sourcePath, folderPath, category);
        if (copied) imported.push(copied);
      } catch (error) {
        console.warn('Não foi possível importar um dos arquivos soltos no pad:', error.message);
      }
    }
    return { success: true, imported, skipped: Math.max(0, sourcePaths.length - imported.length) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:resolve-audio', async (_event, { folderPath, relativePath }) => {
  try {
    if (!folderPath || typeof relativePath !== 'string') throw new Error('Caminho de áudio inválido.');
    const basePath = path.resolve(folderPath);
    const filePath = path.resolve(basePath, relativePath);
    const audioRoot = path.resolve(basePath, 'assets', 'audio');
    const relative = path.relative(audioRoot, filePath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('O áudio precisa estar dentro da pasta de áudio do projeto.');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error('Arquivo de áudio não encontrado.');
    return { success: true, fileUrl: pathToFileURL(filePath).href };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:remove-audio', async (_event, { folderPath, relativePath }) => {
  try {
    if (!folderPath || typeof relativePath !== 'string') throw new Error('Caminho de áudio inválido.');
    const basePath = path.resolve(folderPath);
    const audioRoot = path.resolve(basePath, 'assets', 'audio');
    const filePath = path.resolve(basePath, relativePath);
    const relative = path.relative(audioRoot, filePath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('O áudio precisa estar dentro da pasta de áudio do projeto.');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 3. Salvar dados do projeto em disco (project.json)
ipcMain.handle('project:save', async (event, { folderPath, projectData }) => {
  try {
    if (!folderPath) throw new Error('Caminho da pasta inválido.');
    
    // Cria a pasta do projeto caso ainda não exista
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const projectFilePath = path.join(folderPath, 'project.json');
    const savedAt = new Date().toISOString();
    const dataToSave = { ...projectData, lastSavedAt: savedAt };
    const serialized = JSON.stringify(dataToSave, null, 2);
    if (fs.existsSync(projectFilePath)) {
      const previous = fs.readFileSync(projectFilePath, 'utf-8');
      try {
        const previousData = JSON.parse(previous);
        const { lastSavedAt: _previousSavedAt, ...previousContent } = previousData;
        const { lastSavedAt: _nextSavedAt, ...nextContent } = dataToSave;
        if (JSON.stringify(previousContent) !== JSON.stringify(nextContent)) snapshotProjectFile(folderPath, projectFilePath);
      } catch {
        snapshotProjectFile(folderPath, projectFilePath);
      }
    }
    const temporaryPath = projectFilePath + '.tmp';
    fs.writeFileSync(temporaryPath, serialized, 'utf-8');
    fs.renameSync(temporaryPath, projectFilePath);

    return { success: true, filePath: projectFilePath, savedAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function snapshotProjectFile(folderPath, projectFilePath, force = false) {
  if (!fs.existsSync(projectFilePath)) return;
  const historyPath = path.join(folderPath, '.scryba-history');
  fs.mkdirSync(historyPath, { recursive: true });
  const snapshots = fs.readdirSync(historyPath)
    .filter(name => /^\d{4}-.*\.json$/.test(name))
    .map(name => ({ name, modifiedAt: fs.statSync(path.join(historyPath, name)).mtimeMs }))
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
  if (!force && snapshots.length && Date.now() - snapshots[0].modifiedAt < 60_000) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(projectFilePath, path.join(historyPath, `${stamp}.json`));
  for (const oldSnapshot of snapshots.slice(39)) fs.rmSync(path.join(historyPath, oldSnapshot.name), { force: true });
}

ipcMain.handle('project:list-versions', async (_event, folderPath) => {
  try {
    if (!folderPath) throw new Error('A pasta do projeto não foi encontrada.');
    const historyPath = path.join(folderPath, '.scryba-history');
    if (!fs.existsSync(historyPath)) return { success: true, versions: [] };
    const versions = fs.readdirSync(historyPath)
      .filter(name => /^\d{4}-.*\.json$/.test(name))
      .map(fileName => {
        const filePath = path.join(historyPath, fileName);
        const projectData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
          fileName,
          savedAt: projectData.lastSavedAt || fs.statSync(filePath).mtime.toISOString(),
          title: projectData.title || 'Projeto sem nome',
          chapterCount: Array.isArray(projectData.chapters) ? projectData.chapters.length : 0
        };
      })
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
    return { success: true, versions };
  } catch (err) {
    return { success: false, error: err.message, versions: [] };
  }
});

ipcMain.handle('project:restore-version', async (_event, { folderPath, fileName }) => {
  try {
    if (!folderPath || typeof fileName !== 'string' || path.basename(fileName) !== fileName || !/^\d{4}-.*\.json$/.test(fileName)) {
      throw new Error('Versão inválida.');
    }
    const projectFilePath = path.join(folderPath, 'project.json');
    const snapshotPath = path.join(folderPath, '.scryba-history', fileName);
    if (!fs.existsSync(snapshotPath)) throw new Error('Esta versão não está mais disponível.');
    snapshotProjectFile(folderPath, projectFilePath, true);
    const projectData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    const savedAt = new Date().toISOString();
    const restored = { ...projectData, lastSavedAt: savedAt };
    const temporaryPath = projectFilePath + '.tmp';
    fs.writeFileSync(temporaryPath, JSON.stringify(restored, null, 2), 'utf-8');
    fs.renameSync(temporaryPath, projectFilePath);
    return { success: true, projectData: restored, savedAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 4. Carregar dados do projeto existente
ipcMain.handle('project:load', async (event, folderPath) => {
  try {
    const projectFilePath = path.join(folderPath, 'project.json');
    if (!fs.existsSync(projectFilePath)) {
      return { success: false, error: 'Arquivo project.json não encontrado na pasta.' };
    }

    const fileContent = fs.readFileSync(projectFilePath, 'utf-8');
    const projectData = JSON.parse(fileContent);
    const savedAt = projectData.lastSavedAt || fs.statSync(projectFilePath).mtime.toISOString();
    projectData.lastSavedAt = savedAt;
    return { success: true, data: projectData, savedAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function safeProjectFolderName(title) {
  const cleaned = String(title || 'Projeto sem nome')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .slice(0, 100);
  const safeName = cleaned || 'Projeto sem nome';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safeName) ? `_${safeName}` : safeName;
}

ipcMain.handle('project:rename-folder', async (event, { storagePath, oldFolderPath, projectData }) => {
  try {
    const validation = validateStorageDirectory(storagePath);
    if (!validation.valid) throw new Error(validation.error);
    if (!projectData?.id || !projectData?.title) throw new Error('Os dados do projeto estão incompletos.');

    const baseName = safeProjectFolderName(projectData.title);
    let destination = path.join(storagePath, baseName);
    let suffix = 2;
    const oldResolved = oldFolderPath ? path.resolve(oldFolderPath) : '';
    while (fs.existsSync(destination) && path.resolve(destination) !== oldResolved) {
      const existingProjectFile = path.join(destination, 'project.json');
      let isSameProject = false;
      try {
        isSameProject = JSON.parse(fs.readFileSync(existingProjectFile, 'utf-8')).id === projectData.id;
      } catch (_) {}
      if (isSameProject) break;
      destination = path.join(storagePath, `${baseName} (${suffix++})`);
    }

    if (oldResolved && fs.existsSync(oldResolved) && oldResolved !== path.resolve(storagePath) && oldResolved !== path.resolve(destination)) {
      const relativeFromSourceToStorage = path.relative(oldResolved, path.resolve(storagePath));
      const sourceContainsStorage = relativeFromSourceToStorage === '' || (!relativeFromSourceToStorage.startsWith('..') && !path.isAbsolute(relativeFromSourceToStorage));
      if (!sourceContainsStorage && !fs.existsSync(destination)) {
        const relativeFromStorageToSource = path.relative(path.resolve(storagePath), oldResolved);
        const sourceIsInsideStorage = relativeFromStorageToSource !== '..' && !relativeFromStorageToSource.startsWith('..' + path.sep) && !path.isAbsolute(relativeFromStorageToSource);
        if (sourceIsInsideStorage) {
          try {
            fs.renameSync(oldResolved, destination);
          } catch (error) {
            if (error.code !== 'EXDEV') throw error;
            fs.cpSync(oldResolved, destination, { recursive: true, errorOnExist: true, force: false });
          }
        } else {
          fs.cpSync(oldResolved, destination, { recursive: true, errorOnExist: true, force: false });
        }
      }
    }

    fs.mkdirSync(destination, { recursive: true });
    projectData.folderPath = destination;
    fs.writeFileSync(path.join(destination, 'project.json'), JSON.stringify(projectData, null, 2), 'utf-8');
    return { success: true, folderPath: destination };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function getStorageSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function validateStorageDirectory(folderPath) {
  try {
    if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return { valid: false, error: 'A pasta selecionada não existe ou não é uma pasta.' };
    }
    const probePath = path.join(folderPath, `.scryba-write-test-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probePath, 'Scryba storage check', { flag: 'wx' });
    fs.unlinkSync(probePath);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'A pasta não permite gravação: ' + error.message };
  }
}

ipcMain.handle('storage:get-location', () => {
  try {
    const settingsPath = getStorageSettingsPath();
    if (!fs.existsSync(settingsPath)) return { success: true, path: null };
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (!settings.storagePath) return { success: true, path: null };
    const validation = validateStorageDirectory(settings.storagePath);
    return validation.valid
      ? { success: true, path: settings.storagePath }
      : { success: false, path: null, error: validation.error };
  } catch (error) {
    return { success: false, path: null, error: error.message };
  }
});

ipcMain.handle('storage:select-location', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolha onde o Scryba armazenará seus projetos',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
  const folderPath = result.filePaths[0];
  const validation = validateStorageDirectory(folderPath);
  return validation.valid
    ? { success: true, path: folderPath }
    : { success: false, path: null, error: validation.error };
});

ipcMain.handle('storage:set-location', (event, folderPath) => {
  const validation = validateStorageDirectory(folderPath);
  if (!validation.valid) return { success: false, error: validation.error };
  try {
    fs.writeFileSync(getStorageSettingsPath(), JSON.stringify({ storagePath: folderPath }, null, 2), 'utf-8');
    return { success: true, path: folderPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:load-index', (event, folderPath) => {
  try {
    const indexPath = path.join(folderPath, 'projects-index.json');
    if (fs.existsSync(indexPath)) {
      const projects = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      return { success: true, projects: Array.isArray(projects) ? projects : [] };
    }
    const discovered = [];
    const directProjectPath = path.join(folderPath, 'project.json');
    if (fs.existsSync(directProjectPath)) {
      const project = JSON.parse(fs.readFileSync(directProjectPath, 'utf-8'));
      if (project?.id) discovered.push({ id: project.id, title: project.title, type: project.type, folderPath });
    }
    const projectDirectories = [folderPath, path.join(folderPath, 'projects')];
    for (const projectsDirectory of projectDirectories) {
      if (!fs.existsSync(projectsDirectory)) continue;
      for (const entry of fs.readdirSync(projectsDirectory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const projectFolder = path.join(projectsDirectory, entry.name);
        const projectPath = path.join(projectFolder, 'project.json');
        if (!fs.existsSync(projectPath)) continue;
        try {
          const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
          if (project?.id && !discovered.some(item => item.id === project.id)) {
            discovered.push({ id: project.id, title: project.title, type: project.type, folderPath: projectFolder });
          }
        } catch (error) {
          console.warn('Arquivo de projeto ignorado durante a recuperação:', projectPath, error.message);
        }
      }
    }
    return { success: true, projects: discovered };
  } catch (error) {
    return { success: false, projects: [], error: error.message };
  }
});

ipcMain.handle('storage:save-index', (event, { folderPath, projects }) => {
  try {
    const validation = validateStorageDirectory(folderPath);
    if (!validation.valid) throw new Error(validation.error);
    const indexPath = path.join(folderPath, 'projects-index.json');
    const temporaryPath = indexPath + '.tmp';
    const portableProjects = (Array.isArray(projects) ? projects : []).map(project => {
      if (!project.folderPath || !path.isAbsolute(project.folderPath)) return project;
      const relativeFolder = path.relative(folderPath, project.folderPath);
      const isInsideStorage = relativeFolder === '' || (relativeFolder !== '..' && !relativeFolder.startsWith('..' + path.sep) && !path.isAbsolute(relativeFolder));
      return isInsideStorage ? { ...project, folderPath: relativeFolder || '.' } : project;
    });
    fs.writeFileSync(temporaryPath, JSON.stringify(portableProjects, null, 2), 'utf-8');
    fs.renameSync(temporaryPath, indexPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
