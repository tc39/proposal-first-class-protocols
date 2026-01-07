import fs from 'fs';
import { readFile, rename } from 'fs/promises';
import pathlib from 'path';
import { pipeline } from 'stream/promises';
import { parseArgs } from 'util';
import { JSDOM } from 'jsdom';
import { RewritingStream } from 'parse5-html-rewriting-stream';
import tmp from 'tmp';

const { positionals: cliArgs } = parseArgs({
  allowPositionals: true,
  options: {},
});
if (cliArgs.length < 3) {
  const self = pathlib.relative(process.cwd(), process.argv[1]);
  console.error(`Usage: node ${self} <template.html> <data.json> <file.html>...

{{identifier}} substrings in template.html are replaced from data.json, then
the result is inserted into each file.html.`);
  process.exit(64);
}

const main = async ([templateFile, dataFile, ...files]) => {
  // Substitute data into the template.
  const [
    template,
    data,
  ] = await Promise.all([
    readFile(templateFile, 'utf8'),
    readFile(dataFile, 'utf8').then(JSON.parse),
  ])
  const formatErrors = [];
  const placeholderPatt = /[{][{](?:([\p{ID_Start}$_][\p{ID_Continue}$]*)[}][}]|.*?(?:[}][}]|(?=[{][{])|$))/gsu;
  const resolved = template.replaceAll(placeholderPatt, (m, name, i) => {
    if (!name) {
      const trunc = m.replace(/([^\n]{29}(?!$)|[^\n]{,29}(?=\n)).*/s, '$1…');
      formatErrors.push(new SyntaxError(`bad placeholder at index ${i}: ${trunc}`));
    } else if (!Object.hasOwn(data, name)) {
      formatErrors.push(new ReferenceError(`no data for ${m}`));
    }
    return data[name];
  });
  if (formatErrors.length > 0) {
    throw new AggregateError(formatErrors);
  }

  // Parse the template into DOM nodes for appending to page head (metadata such
  // as <style> elements) or prepending to page body (everything else).
  const jsdomOpts = { contentType: 'text/html; charset=utf-8' };
  const { document } = new JSDOM(resolved, jsdomOpts).window;
  const headHTML = document.head.innerHTML;
  const bodyHTML = document.body.innerHTML;

  // Perform the insertions.
  const work = files.map(async (file) => {
    await null;
    const { name: tmpName, fd, removeCallback } = tmp.fileSync({
      tmpdir: pathlib.dirname(file),
      prefix: pathlib.basename(file),
      postfix: '.tmp',
      detachDescriptor: true,
    });
    try {
      // Make a pipeline: fileReader -> inserter -> finisher -> fileWriter
      const fileReader = fs.createReadStream(file, 'utf8');
      const fileWriter = fs.createWriteStream('', { fd, flush: true });

      // Insert headHTML at the end of a possibly implied head, and bodyHTML at
      // the beginning of a possibly implied body.
      // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhtml
      let mode = 'before html'; // | 'before head' | 'in head' | 'after head' | '$DONE'
      const stayInHead = new Set([
        'base',
        'basefont',
        'bgsound',
        'head',
        'link',
        'meta',
        'noframes',
        'noscript',
        'script',
        'style',
        'template',
        'title',
      ]);
      const inserter = new RewritingStream();
      const onEndTag = function (tag) {
        if (tag.tagName === 'head') {
          this.emitRaw(headHTML);
          mode = 'after head';
        }
        this.emitEndTag(tag);
      };
      const onStartTag = function (tag) {
        const echoTag = () => this.emitStartTag(tag);
        if (mode === 'before html' && tag.tagName === 'html') {
          mode = 'before head';
        } else if (mode !== 'after head' && stayInHead.has(tag.tagName)) {
          mode = 'in head';
        } else {
          if (mode !== 'after head') { this.emitRaw(headHTML); }
          // Emit either `${bodyTag}${bodyHTML}` or `${bodyHTML}${otherTag}`.
          const emits = [echoTag, () => this.emitRaw(bodyHTML)];
          if (tag.tagName !== 'body') { emits.reverse(); }
          for (const emit of emits) { emit(); }
          mode = '$DONE';
          this.off('endTag', onEndTag).off('startTag', onStartTag);
          return;
        }
        echoTag();
      };
      inserter.on('endTag', onEndTag).on('startTag', onStartTag);

      // Ensure headHTML/bodyHTML insertion before EOF.
      const finisher = async function* (source) {
        for await (const chunk of source) { yield chunk; }
        if (mode === '$DONE') { return; }
        if (mode !== 'after head') { yield headHTML; }
        yield bodyHTML;
      };

      await pipeline(fileReader, inserter, finisher, fileWriter);

      // Now that the temp file is complete, overwrite the source file.
      await rename(tmpName, file);
    } finally {
      removeCallback();
    }
  });
  const results = await Promise.allSettled(work);

  const failures = results.filter((result) => result.status !== 'fulfilled');
  if (failures.length > 0) {
    throw new AggregateError(failures.map((r) => r.reason));
  }
};

main(cliArgs).catch((err) => {
  console.error(err);
  process.exit(1);
});
