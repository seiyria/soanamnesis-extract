
const argv = require('minimist')(process.argv.slice(2));

const SOADecLocation = argv['soa-dec-location'] || './bin/SOADec.exe';
const SOAImgExLocation = argv['soa-imgex-location'] ||'./bin/SOAImgEx.exe';
const PVRTexToolLocation = argv['pvr-textool-location'] ||'./bin/PVRTexToolCLI.exe';

const INPUT_DIRECTORY = argv['input-folder'] || './input';
const OUTPUT_DIRECTORY = argv['output-folder'] || './output';
const ERROR_LOG_FILE = argv['error-log'] || './error.log';

const FILE_FILTER = argv['filter'] || '';

const fs = require('fs-extra');
const rimraf = require('rimraf');
const glob = require('glob');
const path = require('path');
const exec = require('child_process').execSync;

// Clean previous SOADec output
rimraf.sync(path.join(__dirname, INPUT_DIRECTORY, '*_unpack*'));

// SOADec - unpack the files
exec(`"${path.join(__dirname, SOADecLocation)}" "${path.join(__dirname, INPUT_DIRECTORY)}"`);

// get the unpacked files
const files = glob.sync(path.join(__dirname, INPUT_DIRECTORY, '*_unpack*'));

// make a directory for files to go into
fs.mkdirpSync(path.join(__dirname, OUTPUT_DIRECTORY));

const errorFiles = [];

// go through the unpacked files and unpack them more
for(file of files) {

  // filter files by FILE_FILTER
  if(FILE_FILTER && file.indexOf(FILE_FILTER) === -1) continue;

  exec(`"${path.join(__dirname, SOAImgExLocation)}" "${file}"`);

  const texturePath = path.join(process.cwd(), 'Textures', '*');
  const generatedFiles = glob.sync(texturePath);
  const fileNameBase = path.basename(file).split('_unpack')[0];
  
  // decompress each file
  let curGenFile = 0;
  for(genFile of generatedFiles) {
    try {
      exec(`"${path.join(__dirname, PVRTexToolLocation)}" -i "${genFile}" -f r8g8b8a8 -d "${path.join(__dirname, OUTPUT_DIRECTORY, `${fileNameBase}-${curGenFile++}.png`)}"`);
    } catch(e) {
      const error = `Skipping ${file} -> ${genFile}: ${e.message}`;
      errorFiles.push(error);
      console.error(new Error(error));
    }
  }
  // remove all of the old textures so we dont double-process
  rimraf.sync(texturePath);
}

// Clean SOADec output because we dont want to leave the input folder in a different state than it came
rimraf.sync(path.join(__dirname, INPUT_DIRECTORY, '*_unpack*'));

if(errorFiles.length > 0) fs.outputFileSync(ERROR_LOG_FILE, errorFiles.join('\r\n'));